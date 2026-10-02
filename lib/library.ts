import { getSupabaseAdmin } from "./supabase";
import { tagTranscript, GroqRateLimitError } from "./topicTagger";

export const LIST_COLUMNS =
  "id, created_at, kind, title, episode_label, guest_name, parent_id, video_url, summary, topics, tag_status";

/** Runs the AI tagger for one item and saves the result. */
export async function tagItem(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: item, error } = await supabase
    .from("media_items")
    .select("id, kind, transcript")
    .eq("id", id)
    .single();
  if (error || !item) throw new Error(error?.message || "Item not found.");

  try {
    const { topics, summary } = await tagTranscript(item.transcript, item.kind);
    const { data, error: upErr } = await supabase
      .from("media_items")
      .update({ topics, summary, tag_status: "tagged" })
      .eq("id", id)
      .select(LIST_COLUMNS)
      .single();
    if (upErr) throw new Error(upErr.message);
    return { item: data, rateLimited: false };
  } catch (err) {
    if (err instanceof GroqRateLimitError) {
      const { data } = await supabase.from("media_items").select(LIST_COLUMNS).eq("id", id).single();
      return { item: data, rateLimited: true };
    }
    await supabase.from("media_items").update({ tag_status: "failed" }).eq("id", id);
    throw err;
  }
}
