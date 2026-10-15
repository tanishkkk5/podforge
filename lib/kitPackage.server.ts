/**
 * Everything that goes in a guest's "Download all" zip and Drive bundle:
 * every image (named in posting order) + LinkedIn and Instagram caption files + a short README.
 */
import { captionsFile, POSTS, postImages, postsWithImages } from "./guestCaptions";
import { fixBrand } from "./showNotes";

export interface PackageFile { path: string; url?: string; text?: string }

export function kitPackageFiles(kit: any): PackageFile[] {
  const ep = `EP-${String(kit.episode_number || "").replace(/^ep-?/i, "")}`;
  const keys = postsWithImages(kit.image_urls);
  const files: PackageFile[] = [];
  keys.forEach((k) => {
    const post = POSTS.find((p) => p.key === k)!;
    const imgs = postImages(kit.image_urls, k);
    imgs.forEach((url, i) =>
      files.push({ path: `Posts/${ep} ${post.file}${imgs.length > 1 ? ` ${String(i + 1).padStart(2, "0")}` : ""}.png`, url })
    );
  });
  files.push({ path: "Captions - LinkedIn.txt", text: captionsFile(kit, "li", keys) });
  files.push({ path: "Captions - Instagram.txt", text: captionsFile(kit, "ig", keys) });
  files.push({ path: "README.txt", text: readme(kit, keys.length) });
  return files;
}

export function readme(kit: any, postCount: number): string {
  return fixBrand(`Your Profit Streams® Podcast guest kit
${kit.title}, with ${kit.guest_name} (hosted by ${kit.host_name})

What's inside
- Posts/: ${postCount} ready-to-post images, numbered in posting order. Carousel slides go together in one post, in order.
- Captions - LinkedIn.txt and Captions - Instagram.txt: one caption per post. Pick the one that sounds most like you.

When to post
- The episode goes live on Saturday at 7:30 AM ET. Posting in the first 24 hours gives it the biggest boost.
- A second post (quote card or takeaways carousel) works well Tuesday to Thursday morning.
- On LinkedIn, tag Luke Hohmann by typing @ and picking his name, so his network sees it too.

Questions? Email tpandey@appliedframeworks.com
`);
}

/** Safe file/folder name piece. */
export const safeName = (s: string) => (s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
