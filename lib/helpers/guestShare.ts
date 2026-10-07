/**
 * Guest Share Drafter (knowledge/skills/guest-share-drafter.md).
 * One job: draft the email that sends a guest their approved kit, and a
 * friendly one-week reminder. Fixed templates — no AI. A person sends them.
 */
export function draftGuestShare(guest: { name: string; email: string | null }, kitUrl: string, hostFirst: string) {
  const first = guest.name.trim().split(/\s+/)[0] || "there";
  return {
    title: `Send ${guest.name} their guest kit (send on the Friday before launch)`,
    content: [
      `To: ${guest.email || "[guest email]"}`,
      `Subject: Your Profit Streams® Podcast episode goes live tomorrow`,
      ``,
      `Hi ${first},`,
      ``,
      `Thanks again for a great conversation with ${hostFirst}! Your episode goes live tomorrow, Saturday, at 7:30 AM ET on Apple Podcasts and Spotify.`,
      ``,
      `Your episode kit is ready — quote cards, clips and ready-to-post captions you can copy as-is or tweak:`,
      kitUrl,
      ``,
      `The first 24 hours after launch make the biggest difference for reach, so if you're able to post on Saturday or Sunday, that would be wonderful. Please tag ${hostFirst} and the Profit Streams® Podcast so we can amplify your post.`,
      ``,
      `Thank you!`,
      `Tanisk`,
      `Applied Frameworks · Profit Streams® Podcast`,
    ].join("\n"),
  };
}

export function draftGuestReminder(guest: { name: string; email: string | null }, kitUrl: string) {
  const first = guest.name.trim().split(/\s+/)[0] || "there";
  return {
    title: `Reminder: ${guest.name} hasn't shared yet (launch day + 1)`,
    content: [
      `To: ${guest.email || "[guest email]"}`,
      `Subject: Your episode is live!`,
      ``,
      `Hi ${first},`,
      ``,
      `Your Profit Streams® Podcast episode went live yesterday — thanks again for being part of it! In case the kit got buried, the ready-to-post captions are here:`,
      kitUrl,
      ``,
      `Even one post this weekend makes a real difference for the episode. Thank you!`,
      ``,
      `Best,`,
      `Tanisk`,
    ].join("\n"),
  };
}
