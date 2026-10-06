/**
 * Guest Share Drafter (knowledge/skills/guest-share-drafter.md).
 * One job: draft the email that sends a guest their approved kit, and a
 * friendly one-week reminder. Fixed templates — no AI. A person sends them.
 */
export function draftGuestShare(guest: { name: string; email: string | null }, kitUrl: string, hostFirst: string) {
  const first = guest.name.trim().split(/\s+/)[0] || "there";
  return {
    title: `Send ${guest.name} their guest kit`,
    content: [
      `To: ${guest.email || "[guest email]"}`,
      `Subject: Your Profit Streams® Podcast episode kit is ready`,
      ``,
      `Hi ${first},`,
      ``,
      `Thanks again for a great conversation with ${hostFirst}! Your episode kit is ready — images, quote cards and ready-to-post captions for LinkedIn and Instagram:`,
      kitUrl,
      ``,
      `If you share it, please tag ${hostFirst} and the Profit Streams® Podcast so we can amplify your post.`,
      ``,
      `Best,`,
      `Tanisk`,
      `Applied Frameworks · Profit Streams® Podcast`,
    ].join("\n"),
  };
}

export function draftGuestReminder(guest: { name: string; email: string | null }, kitUrl: string) {
  const first = guest.name.trim().split(/\s+/)[0] || "there";
  return {
    title: `Reminder: ${guest.name} hasn't shared yet`,
    content: [
      `To: ${guest.email || "[guest email]"}`,
      `Subject: Quick nudge — your episode kit`,
      ``,
      `Hi ${first},`,
      ``,
      `Just a gentle nudge in case it got buried — your Profit Streams® Podcast episode kit is here, with posts ready to copy:`,
      kitUrl,
      ``,
      `Even one post makes a real difference for the episode. Thanks so much!`,
      ``,
      `Best,`,
      `Tanisk`,
    ].join("\n"),
  };
}
