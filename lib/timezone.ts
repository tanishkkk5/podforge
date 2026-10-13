/**
 * Time zones for scheduling recordings. A <input type="datetime-local"> value
 * ("2026-10-21T11:00") has NO time zone, so it must be converted using the
 * time zone the person meant — otherwise the database treats it as UTC
 * (this caused a recording entered as 11:30 to show as 5:00 PM IST).
 * Pure functions, no libraries; daylight saving handled via Intl.
 */
export const TIMEZONES = [
  { id: "America/Los_Angeles", label: "US Pacific (Luke)" },
  { id: "America/Denver", label: "US Mountain" },
  { id: "America/Chicago", label: "US Central" },
  { id: "America/New_York", label: "US Eastern" },
  { id: "Europe/London", label: "UK" },
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "UTC", label: "UTC" },
] as const;

export const DEFAULT_TZ = "America/Los_Angeles";

/** Offset (ms) of `tz` from UTC at the instant `utcMs`. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const hour = p.hour === 24 ? 0 : p.hour;
  return Date.UTC(p.year, p.month - 1, p.day, hour, p.minute, p.second) - utcMs;
}

/** "2026-10-21T11:00" meant in `tz`  →  exact ISO instant ("2026-10-21T18:00:00.000Z"). */
export function zonedLocalToUtcISO(local: string, tz: string): string {
  const m = (local || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error("Pick a date and time.");
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - tzOffsetMs(guess, tz);
  utc = guess - tzOffsetMs(utc, tz); // second pass handles daylight-saving edges
  return new Date(utc).toISOString();
}

/** e.g. "Wed, Oct 21, 11:00 AM PDT" */
export function formatInZone(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

/** e.g. "Wednesday, October 21 at 11:00 AM PDT" (for emails to guests) */
export function longInZone(iso: string, tz: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${date} at ${time}`;
}

/** True if a string carries an explicit time zone (Z or ±hh:mm). */
export const hasTimeZone = (s: string) => /(Z|[+-]\d{2}:?\d{2})$/.test((s || "").trim());
