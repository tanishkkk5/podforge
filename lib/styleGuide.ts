/**
 * Writing style shared by every Podforge AI prompt (decision 0017).
 * Lenny-style summary · curiosity-first hooks and captions · 2-3 **bold** key phrases.
 */

/** The episode summary, always in the style of Lenny's Podcast episode descriptions. */
export const LENNY_SUMMARY_RULES = `Write the summary in the style of Lenny's Podcast episode descriptions:
- Open with who the guest is, credentials first: "[Full name] is [current role] at [company/what they built]." Then one sentence of concrete proof (companies, results, books, numbers) taken ONLY from the transcript.
- Then one sentence on what this conversation unpacks, specific and plain, ending with: "[First name] joins [host] to [explore the core idea]."
- 3 sentences total, under 75 words, third person, no hype words ("amazing", "incredible", "game-changing"), no questions, no bold markers.`;

/** Curiosity is the main reason people click. */
export const CURIOSITY_RULES = `Make curiosity the reason to click: open a loop the reader wants closed. Use a surprising claim, a counterintuitive result, a specific number, or a tension ("Most teams do X. The best do the opposite."). Be concrete and true to the episode. No clickbait: never promise something the episode doesn't deliver, no "You won't believe", no ALL CAPS.`;

/** Bold markers for captions and image cards. */
export const BOLD_RULES = `Wrap the 2 or 3 most important phrases (2 to 5 words each) in **double asterisks**. Never more than 3, never a whole sentence.`;
