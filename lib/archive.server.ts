/**
 * Ask Archive (RAG): puts an episode's Lenny-style summary + transcript into transcript_chunks
 * (decision 0017). Re-running replaces that episode's earlier chunks, so it never duplicates.
 */
import { getSupabaseAdmin } from "./supabase";
import { chunkText, embedTexts } from "./voyage";
import { stripMarks } from "./textStyle";
import { fixBrand } from "./showNotes";

export function archiveEpisodeName(kit: any): string {
  return `Ep-${kit.episode_number} ${stripMarks(kit.title)}, with ${kit.guest_name}`;
}

/** The summary document: what someone searching the archive should see first. */
export function episodeSummaryDoc(kit: any): string {
  const plain = (t: string) => fixBrand(stripMarks(t || ""));
  const lines = [
    `${archiveEpisodeName(kit)} (Profit Streams® Podcast, host ${kit.host_name})`,
    "",
    plain(kit.summary),
    "",
    `Hook: ${plain(kit.hook)}`,
    "",
    "In this conversation, we discuss:",
    ...(kit.takeaways || []).map((t: string, i: number) => `${i + 1}. ${plain(t)}`),
  ];
  if ((kit.chapters || []).length) lines.push("", "Chapters:", ...kit.chapters.map((c: any) => `(${c.time}) ${plain(c.title)}`));
  const res = (kit.resources || []).map((r: any) => r.label).filter(Boolean);
  if (res.length) lines.push("", `Mentioned: ${res.join("; ")}`);
  if (kit.best_quote) lines.push("", `Quote from ${kit.guest_name}: "${plain(kit.best_quote)}"`);
  return lines.join("\n");
}

async function embedAll(chunks: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < chunks.length; i += 64) out.push(...(await embedTexts(chunks.slice(i, i + 64), "document")));
  return out;
}

export async function archiveEpisode(kit: any): Promise<{ summaryChunks: number; transcriptChunks: number }> {
  const supabase = getSupabaseAdmin();
  const name = archiveEpisodeName(kit);
  const summaryChunks = chunkText(episodeSummaryDoc(kit), 1800, 0);
  const transcriptChunks = kit.transcript ? chunkText(kit.transcript) : [];
  const all = [
    ...summaryChunks.map((c) => ({ c, type: "episode_summary" })),
    ...transcriptChunks.map((c) => ({ c, type: "main_transcript" })),
  ];
  const embeddings = await embedAll(all.map((x) => x.c));

  // Replace this episode's earlier chunks (by name, and by the kit's slug-style old names)
  const del = await supabase.from("transcript_chunks").delete().eq("episode_name", name).in("source_type", ["episode_summary", "main_transcript"]);
  if (del.error) throw new Error(`Couldn't clear old chunks: ${del.error.message}`);

  const rows = all.map((x, i) => ({
    episode_name: name,
    source_type: x.type,
    chunk_index: x.type === "episode_summary" ? i : i - summaryChunks.length,
    content: x.c,
    embedding: embeddings[i],
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("transcript_chunks").insert(rows.slice(i, i + 200));
    if (error) throw new Error(`Couldn't save chunks: ${error.message}`);
  }
  return { summaryChunks: summaryChunks.length, transcriptChunks: transcriptChunks.length };
}
