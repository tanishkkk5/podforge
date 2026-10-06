import { Host, schedulerUrl } from "../hosts";

/**
 * Follow-up Drafter (knowledge/skills/follow-up-drafter.md).
 * One job: draft a friendly nudge for a guest who hasn't booked a recording time.
 * A fixed template — no AI — so nothing can be made up. A person reviews and sends it.
 */
export function draftFollowUp(guest: { fullName: string; email: string }, host: Host): { title: string; content: string } {
  const first = guest.fullName.trim().split(/\s+/)[0] || "there";
  const link = schedulerUrl(host, { fullName: guest.fullName, email: guest.email }, false);
  return {
    title: `Follow-up: ${guest.fullName} hasn't booked yet`,
    content: [
      `To: ${guest.email}`,
      `Subject: Picking a recording time for the Profit Streams® Podcast`,
      ``,
      `Hi ${first},`,
      ``,
      `Thanks again for sending over your details for the Profit Streams® Podcast — we're looking forward to the conversation.`,
      ``,
      `Whenever it suits you, you can pick a recording time with ${host.firstName} here:`,
      link,
      ``,
      `If none of the times work, just reply and we'll find one that does.`,
      ``,
      `Best,`,
      `Tanisk`,
      `Applied Frameworks · Profit Streams® Podcast`,
    ].join("\n"),
  };
}
