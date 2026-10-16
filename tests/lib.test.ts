/**
 * Unit tests for Podforge's pure logic. Run: npm test
 * (no database, no AI, no network)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBoldMarks, stripMarks, markRuns, toUnicodeBold } from "../lib/textStyle";
import { fullCaption, captionFooter, defaultBody, noDashes, captionsFile, postsWithImages, POSTS } from "../lib/guestCaptions";
import { buildShowNotes, fixBrand, withAffiliateTag, isAmazonUrl } from "../lib/showNotes";
import { locate, NAV } from "../lib/nav";
import { fixTranscript } from "../lib/transcriptFixes";

const kit: any = {
  guest_name: "Evan Campbell", host_name: "Luke Hohmann", title: "Adapt or Fall Behind",
  hook: "Most strategy fails because nobody owns the **profit model**.", best_quote: "Change is a skill.",
  summary: "Evan Campbell is the author of Adapt to Win. He has coached 200 leadership teams. Evan joins Luke Hohmann to unpack strategy decay.",
  takeaways: Array.from({ length: 10 }, (_, i) => `Takeaway ${i + 1} about **adapting fast**.`),
  chapters: [{ time: "00:00", title: "Intro" }], resources: [], episode_number: "66", extras: {},
};

test("bold markers: stripped, converted, split into runs", () => {
  assert.equal(stripMarks("a **b c** d"), "a b c d");
  assert.equal(applyBoldMarks("x **Hi 9**"), `x ${toUnicodeBold("Hi 9")}`);
  assert.notEqual(toUnicodeBold("Hi"), "Hi");
  assert.deepEqual(markRuns("a **b** c").map((r) => r.bold), [false, true, false]);
  assert.equal(stripMarks("no markers"), "no markers");
});

test("captions: footer always has Luke's LinkedIn, listen link and (by default) book + #ad", () => {
  const li = fullCaption(kit, "title", "li");
  assert.match(li, /linkedin\.com\/in\/lukehohmann/);
  assert.match(li, /profit-streams\.com\/profit-streams-podcast/);
  assert.match(li, /tag=profitstrea0b-20/);
  assert.match(li, /#ad · As an Amazon Associate/);
  assert.doesNotMatch(li, /\*\*/, "markers must become Unicode bold");
  assert.doesNotMatch(li, /🍎/, "no fruit emoji for Apple");
});

test("captions: Amazon switch off removes book link and #ad", () => {
  const li = fullCaption({ ...kit, amazon_in_guest_posts: false }, "quote", "li");
  assert.doesNotMatch(li, /amazon\.com/);
  assert.doesNotMatch(li, /#ad/);
});

test("captions: Spotify/Apple links replace the generic listen link", () => {
  const f = captionFooter({ ...kit, extras: { spotifyUrl: "https://open.spotify.com/x", appleUrl: "https://podcasts.apple.com/y" } }, "li");
  assert.match(f, /Spotify: https:\/\/open\.spotify\.com\/x/);
  assert.match(f, /Apple Podcasts: https:\/\/podcasts\.apple\.com\/y/);
  assert.doesNotMatch(f, /🎧 Listen:/);
});

test("captions: edited text wins, defaults never contain em-dashes", () => {
  const edited = fullCaption({ ...kit, captions: { title: { li: "My own words" } } }, "title", "li");
  assert.ok(edited.startsWith("My own words"));
  for (const p of POSTS) for (const pl of ["li", "ig"] as const) assert.doesNotMatch(defaultBody(kit, p.key, pl), /[—–]/);
  assert.equal(noDashes("a — b"), "a, b");
});

test("captions file lists every post with images", () => {
  const keys = postsWithImages({ title_card: "x", quote_card: "y", takeaways: [], chapters: [] });
  assert.deepEqual(keys, ["title", "quote"]);
  const f = captionsFile(kit, "ig", keys);
  assert.match(f, /Episode Announcement/);
  assert.match(f, /Quote Card/);
});

test("show notes: title format, Lenny summary not doubled, no markers, no Amazon on Spotify/Apple", () => {
  const n = buildShowNotes(kit, "platforms").text;
  assert.ok(n.startsWith("Ep-66 Adapt or Fall Behind, with Evan Campbell"));
  assert.equal((n.match(/joins/g) || []).length, 1);
  assert.doesNotMatch(n, /\*\*/);
  assert.doesNotMatch(n, /amazon\.com/);
  assert.match(n, /In this conversation, we discuss:/);
  const w = buildShowNotes(kit, "website").text;
  assert.match(w, /As an Amazon Associate/);
});

test("brand + affiliate helpers", () => {
  assert.equal(fixBrand("prophet streams rocks"), "Profit Streams® rocks");
  assert.match(withAffiliateTag("https://www.amazon.com/dp/123"), /tag=profitstrea0b-20/);
  assert.equal(isAmazonUrl("https://a.co/d/xyz"), true);
  assert.equal(fixTranscript("skilled agile and profit stream").text, "Scaled Agile and Profit Streams®");
});

test("navigation: 5 places, every page belongs to one", () => {
  assert.equal(NAV.length, 5);
  const pages: [string, string][] = [
    ["/admin/assistant", "home"], ["/admin/stats", "home"], ["/admin/submissions", "guests"], ["/admin", "guests"],
    ["/admin/guest-kits", "episodes"], ["/admin/guest-kits/x-ep1", "episodes"], ["/admin/production", "episodes"],
    ["/admin/guest-kit-generator", "episodes"], ["/admin/pipeline", "episodes"], ["/admin/clip-finder", "episodes"],
    ["/admin/library", "content"], ["/admin/creators", "content"], ["/tools/ask-archive", "archive"],
    ["/admin/upload-transcript", "archive"], ["/tools/transcript-check", "archive"],
  ];
  for (const [p, key] of pages) assert.equal(locate(p).section?.key, key, p);
  assert.equal(locate("/guestkit/abc").section, null);
});

import { cleanTranscript, splitParts, readingPlan, PART_CHARS } from "../lib/condense";

test("long transcripts: cleaned, split into parts, nothing lost", () => {
  const raw = "Luke Hohmann (00:01)\nUm, so welcome. Uh, today we talk pricing.\n\nEvan Campbell (00:15)\nYou know, the the answer is a kind of tool.";
  const c = cleanTranscript(raw);
  assert.match(c, /Luke Hohmann:/);
  assert.doesNotMatch(c, /\(00:01\)|\bUm\b|\bUh\b/);
  assert.match(c, /kind of tool/, "meaningful phrases stay");
  assert.match(c, /the answer/);
  const long = Array.from({ length: 4000 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
  const parts = splitParts(long);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= PART_CHARS));
  assert.equal(parts.join(" ").replace(/\s+/g, " ").length, long.length, "every character kept");
  assert.equal(readingPlan("short text").singlePass, true);
  assert.equal(readingPlan(long).singlePass, false);
});

import { quoteCandidates, closestCandidate, abbreviationsIn } from "../lib/quotes";

test("real quotes: only the guest's own sentences, with their time", () => {
  const raw = [
    "Luke Hohmann (00:00:05)", "Welcome Mike. Tell us about the analyst world and how vendors chase the MQ every single year.",
    "Mike Gilpin (00:00:20)", "Um, the thing is, everybody wants to be in the top right of the MQ, but very few vendors actually ask what customers value. That's the real gap.",
    "Mike Gilpin (00:01:40)", "Yeah. Pricing should follow the value metric your customer already tracks, not the one your finance team likes.",
  ].join("\n");
  const c = quoteCandidates(raw, "Mike Gilpin", "Luke Hohmann");
  assert.ok(c.length >= 2);
  assert.ok(c.every((q) => !/Welcome Mike/.test(q.text)), "host lines never become quotes");
  assert.ok(c.every((q) => !/\bUm\b/.test(q.text)), "fillers trimmed");
  assert.ok(c.some((q) => q.time === "00:20" || q.time?.startsWith("00:2")), "time from the speaker header");
  const hit = closestCandidate("Pricing should follow the value metric your customer already tracks", c);
  assert.ok(hit && hit.score > 0.6 && /value metric/.test(hit.cand.text));
  assert.deepEqual(abbreviationsIn("Everybody wants the MQ, not the CEO"), ["MQ"]);
});
