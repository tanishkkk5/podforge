import { cleanTopics } from "./topics";

/** Keeps only valid creator fields from a request body. */
export function cleanCreator(b: any) {
  const platforms = Array.isArray(b.platforms)
    ? b.platforms.filter((p: string) => p === "linkedin" || p === "instagram")
    : undefined;
  return {
    ...(typeof b.name === "string" ? { name: b.name.trim() } : {}),
    ...(typeof b.profile_url === "string" ? { profile_url: b.profile_url.trim() || null } : {}),
    ...(typeof b.notes === "string" ? { notes: b.notes.trim() || null } : {}),
    ...(platforms ? { platforms: platforms.length ? platforms : ["linkedin"] } : {}),
    ...(Array.isArray(b.topics) ? { topics: cleanTopics(b.topics) } : {}),
  };
}
