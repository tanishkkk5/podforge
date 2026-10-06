/**
 * Podcast hosts and their HubSpot meeting (booking) pages.
 * After a guest submits the intake form, the thank-you page embeds the
 * chosen host's calendar so the guest books the recording right away
 * (decision 0012). Booking on the host's OWN link also makes the host the
 * calendar invite's organizer.
 *
 * To add a host: copy an entry, give it a short key (used in the intake link,
 * e.g. ?host=laura) and paste their HubSpot meetings link. Never guess a link.
 */
export interface Host {
  key: string;
  name: string;
  firstName: string;
  schedulingUrl: string;
}

export const HOSTS: Host[] = [
  {
    key: "luke",
    name: "Luke Hohmann",
    firstName: "Luke",
    schedulingUrl: "https://appliedframeworks.com/meetings/luke-hohmann?uuid=965d0a9d-16b9-45c9-8961-aef8f22ea9d6",
  },
];

export const DEFAULT_HOST_KEY = "luke";

/** The host for an intake link's ?host= value; unknown or missing → the default host. */
export function hostByKey(key?: string | null): Host {
  const k = (key || "").trim().toLowerCase();
  return HOSTS.find((h) => h.key === k) || HOSTS.find((h) => h.key === DEFAULT_HOST_KEY) || HOSTS[0];
}

/** The host's booking page, pre-filled with the guest's details (HubSpot fills these after a time is picked). */
export function schedulerUrl(host: Host, guest: { fullName?: string; email?: string }, embed: boolean): string {
  const u = new URL(host.schedulingUrl);
  if (embed) u.searchParams.set("embed", "true");
  const parts = (guest.fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts[0]) u.searchParams.set("firstname", parts[0]);
  if (parts.length > 1) u.searchParams.set("lastname", parts.slice(1).join(" "));
  if (guest.email) u.searchParams.set("email", guest.email.trim());
  return u.toString();
}

/** Messages from the embedded calendar come from HubSpot or from the host's own (custom-domain) booking page. */
export function isSchedulerOrigin(origin: string, host: Host): boolean {
  try {
    const o = new URL(origin);
    return o.origin === new URL(host.schedulingUrl).origin || o.hostname === "meetings.hubspot.com" || o.hostname.endsWith(".hubspot.com");
  } catch {
    return false;
  }
}
