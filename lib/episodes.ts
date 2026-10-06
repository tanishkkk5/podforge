/**
 * Production Assistant — the episode stages and the rules the agent uses to
 * notice what needs doing (decision 0013). Pure logic, no database or AI calls,
 * so it's easy to test. The agent only SUGGESTS; a person accepts every step.
 */

export const STAGES = [
  { key: "intake", label: "Intake received", next: "Guest books a recording time" },
  { key: "booked", label: "Booked", next: "Record on Riverside, then mark Recorded" },
  { key: "recorded", label: "Recorded", next: "Export the transcript from Riverside and generate the guest kit" },
  { key: "kit", label: "Kit drafted", next: "Review and approve the guest kit" },
  { key: "approved", label: "Kit approved", next: "Publish the episode, then mark Published" },
  { key: "published", label: "Published", next: "Send the guest their kit and make creator kits" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const stageIndex = (k: string) => STAGES.findIndex((s) => s.key === k);
export const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label || k;
export const isStage = (k: unknown): k is StageKey => typeof k === "string" && stageIndex(k) >= 0;

export interface Episode {
  id: string;
  created_at: string;
  guest_name: string;
  guest_email: string | null;
  host_key: string;
  episode_number: string | null;
  intake_id: string | null;
  guest_kit_slug: string | null;
  stage: StageKey;
  drive_folder_id?: string | null;
  guest_posted_at?: string | null;
}
export interface Intake {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  host: string | null;
  booked_at: string | null;
  session_id: string | null;
}
export interface Kit {
  slug: string;
  guest_name: string;
  episode_number: string | null;
  status: string | null;
}
export interface Draft {
  id: string;
  episode_id: string | null;
  helper: string;
  status: string;
  reviewed_at?: string | null;
}
export interface DropFile { id: string; name: string }
export interface StatRow { week_of: string; platform: string }

export type Helper = "prep_brief" | "follow_up" | "social_pack" | "guest_share" | "guest_reminder";

export type Suggestion =
  | { kind: "create_episode"; key: string; intakeId: string; text: string }
  | { kind: "advance"; key: string; episodeId: string; to: StageKey; text: string }
  | { kind: "link_kit"; key: string; episodeId: string; slug: string; text: string }
  | { kind: "draft"; key: string; episodeId: string; helper: Helper; text: string }
  | { kind: "drive_folders"; key: string; episodeId: string; text: string }
  | { kind: "todo"; key: string; episodeId: string; text: string; href?: string };

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const DAY = 24 * 60 * 60 * 1000;
export const FOLLOW_UP_AFTER_DAYS = 2;
export const NEW_INTAKE_WINDOW_DAYS = 60;
export const GUEST_REMINDER_AFTER_DAYS = 7;

/** Monday (YYYY-MM-DD, UTC) of the week containing `d`. */
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

/** Which tracked episode a Riverside file belongs to, by the guest's name in the file name. */
export function matchDropFile(file: DropFile, episodes: Episode[]): Episode | null {
  const fname = norm(file.name);
  const candidates = episodes.filter((e) => e.stage !== "published");
  const full = candidates.filter((e) => fname.includes(norm(e.guest_name)) || fname.replace(/[^a-z0-9]/g, "").includes(norm(e.guest_name).replace(/[^a-z0-9]/g, "")));
  if (full.length === 1) return full[0];
  const byLast = candidates.filter((e) => { const t = tokens(e.guest_name); return t.length > 0 && fname.includes(t[t.length - 1]); });
  return byLast.length === 1 ? byLast[0] : null;
}

/** Everything the agent would like the person to look at, in priority order. */
export function suggestNextSteps(
  episodes: Episode[],
  intakes: Intake[],
  kits: Kit[],
  drafts: Draft[],
  now: Date = new Date(),
  extra: { dropFiles?: DropFile[]; stats?: StatRow[] } = {}
): Suggestion[] {
  const out: Suggestion[] = [];
  const linkedIntakes = new Set(episodes.map((e) => e.intake_id).filter(Boolean));
  const linkedKits = new Set(episodes.map((e) => e.guest_kit_slug).filter(Boolean));
  const hasDraft = (episodeId: string, helper: string) =>
    drafts.some((d) => d.episode_id === episodeId && d.helper === helper && d.status !== "dismissed");
  const approvedDraft = (episodeId: string, helper: string) =>
    drafts.find((d) => d.episode_id === episodeId && d.helper === helper && d.status === "approved");

  // 0. New Riverside files in the Drive drop folder
  for (const f of extra.dropFiles || []) {
    const ep = matchDropFile(f, episodes);
    out.push(ep
      ? { kind: "todo", key: `drop:${f.id}`, episodeId: ep.id, text: `New Riverside file "${f.name}" — process it for ${ep.guest_name}'s episode (chapters, guest kit, clips)`, href: `/admin/pipeline?episode=${ep.id}&file=${f.id}` }
      : { kind: "todo", key: `drop:${f.id}`, episodeId: "", text: `New Riverside file "${f.name}" — choose which episode it belongs to`, href: `/admin/pipeline?file=${f.id}` });
  }

  // 1. New direct intakes that aren't tracked yet
  for (const i of intakes) {
    if (i.session_id || linkedIntakes.has(i.id)) continue;
    if (now.getTime() - new Date(i.created_at).getTime() > NEW_INTAKE_WINDOW_DAYS * DAY) continue;
    out.push({ kind: "create_episode", key: `create:${i.id}`, intakeId: i.id, text: `New intake from ${i.full_name} — start tracking this episode?` });
  }

  for (const e of episodes) {
    const idx = stageIndex(e.stage);
    const intake = intakes.find((i) => i.id === e.intake_id);
    const kit = kits.find((k) => k.slug === e.guest_kit_slug);

    // 2. Facts the agent noticed that move the episode forward
    if (intake?.booked_at && idx < stageIndex("booked")) {
      out.push({ kind: "advance", key: `adv:${e.id}:booked`, episodeId: e.id, to: "booked", text: `${e.guest_name} booked a recording time — move to Booked?` });
    }
    if (!e.guest_kit_slug) {
      const match = kits.find(
        (k) => !linkedKits.has(k.slug) && norm(k.guest_name) === norm(e.guest_name) &&
          (!e.episode_number || !k.episode_number || norm(k.episode_number) === norm(e.episode_number))
      );
      if (match) {
        out.push({ kind: "link_kit", key: `link:${e.id}:${match.slug}`, episodeId: e.id, slug: match.slug, text: `A guest kit exists for ${e.guest_name} (${match.slug}) — link it to this episode?` });
      }
    }
    if (kit && idx < stageIndex("kit")) {
      out.push({ kind: "advance", key: `adv:${e.id}:kit`, episodeId: e.id, to: "kit", text: `${e.guest_name}'s guest kit is drafted — move to Kit drafted?` });
    }
    if (kit?.status === "approved" && idx < stageIndex("approved")) {
      out.push({ kind: "advance", key: `adv:${e.id}:approved`, episodeId: e.id, to: "approved", text: `${e.guest_name}'s guest kit is approved — move to Kit approved?` });
    }

    // 3. Things a helper could draft
    if (e.stage === "intake" && intake && !intake.booked_at &&
        now.getTime() - new Date(intake.created_at).getTime() >= FOLLOW_UP_AFTER_DAYS * DAY &&
        !hasDraft(e.id, "follow_up")) {
      out.push({ kind: "draft", key: `draft:${e.id}:follow_up`, episodeId: e.id, helper: "follow_up", text: `${e.guest_name} hasn't booked after ${FOLLOW_UP_AFTER_DAYS}+ days — draft a friendly follow-up?` });
    }
    if (e.stage === "booked" && intake && !hasDraft(e.id, "prep_brief")) {
      out.push({ kind: "draft", key: `draft:${e.id}:prep_brief`, episodeId: e.id, helper: "prep_brief", text: `Draft a prep brief for the host before ${e.guest_name}'s recording?` });
    }

    if (kit?.status === "approved" && !hasDraft(e.id, "social_pack")) {
      out.push({ kind: "draft", key: `draft:${e.id}:social_pack`, episodeId: e.id, helper: "social_pack", text: `Write the LinkedIn + Instagram posts for ${e.guest_name}'s episode?` });
    }
    if (kit?.status === "approved" && !hasDraft(e.id, "guest_share")) {
      out.push({ kind: "draft", key: `draft:${e.id}:guest_share`, episodeId: e.id, helper: "guest_share", text: `Draft the email that sends ${e.guest_name} their guest kit?` });
    }
    const shared = approvedDraft(e.id, "guest_share");
    if (shared?.reviewed_at && !e.guest_posted_at && !hasDraft(e.id, "guest_reminder") &&
        now.getTime() - new Date(shared.reviewed_at).getTime() >= GUEST_REMINDER_AFTER_DAYS * DAY) {
      out.push({ kind: "draft", key: `draft:${e.id}:guest_reminder`, episodeId: e.id, helper: "guest_reminder", text: `${e.guest_name} hasn't shared their kit after a week — draft a friendly reminder?` });
    }

    // 4. Human-only steps the agent reminds about
    if (!e.drive_folder_id && stageIndex(e.stage) >= stageIndex("booked")) {
      out.push({ kind: "drive_folders", key: `drive:${e.id}`, episodeId: e.id, text: `Create ${e.guest_name}'s episode folders in Google Drive?` });
    }
    if (e.stage === "recorded" && !e.guest_kit_slug) {
      out.push({ kind: "todo", key: `todo:${e.id}:pipeline`, episodeId: e.id, text: `Process ${e.guest_name}'s Riverside .srt — chapters, guest kit, clips and posts in one go (drop it in the Drive folder, or upload it)`, href: `/admin/pipeline?episode=${e.id}` });
    }
    if (e.stage === "kit" && !hasDraft(e.id, "clip_finder")) {
      const q = new URLSearchParams({ episode: e.id, guest: e.guest_name });
      out.push({ kind: "todo", key: `todo:${e.id}:clips`, episodeId: e.id, text: `Find the best clips in ${e.guest_name}'s episode (upload the Riverside .srt)`, href: `/admin/clip-finder?${q}` });
    }
    if (kit && kit.status !== "approved") {
      out.push({ kind: "todo", key: `todo:${e.id}:approve`, episodeId: e.id, text: `Review and approve ${e.guest_name}'s guest kit`, href: `/admin/guest-kits/${kit.slug}` });
    }
  }
  // 5. Weekly stats check-in (Spotify + Apple)
  if (extra.stats) {
    const week = mondayOf(now);
    const done = new Set(extra.stats.filter((r) => r.week_of === week).map((r) => r.platform));
    if (!done.has("spotify") || !done.has("apple")) {
      out.push({ kind: "todo", key: `stats:${week}`, episodeId: "", text: `Weekly stats check-in: copy this week's Spotify and Apple numbers (2 minutes)`, href: "/admin/stats" });
    }
  }
  return out;
}
