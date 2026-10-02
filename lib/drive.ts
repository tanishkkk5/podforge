/**
 * Turns a Google Drive share link into an embeddable preview URL.
 * Works for file links like:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 * Folder links can't be embedded (returns null).
 * The file must be shared as "Anyone with the link can view" for the
 * player to work for people outside your Google account.
 */
export function driveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (!/drive\.google\.com|docs\.google\.com/.test(s)) return null;
  if (/\/folders\//.test(s)) return null;
  const m = s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

export function drivePreviewUrl(url: string | null | undefined): string | null {
  const id = driveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}
