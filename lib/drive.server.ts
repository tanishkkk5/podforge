import { google } from "googleapis";

/**
 * Google Drive access for Podforge (server only), using the same service
 * account as the Guest List sheet. The service account must be shared as an
 * Editor on:
 *   - the Riverside drop folder (DRIVE_DROP_FOLDER_ID) — read new .srt files
 *   - the podcast root folder (DRIVE_PODCAST_ROOT_FOLDER_ID) — create episode folders
 * The Google Drive API must be enabled in the service account's Cloud project.
 */
function driveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY.");
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/drive"] });
  return google.drive({ version: "v3", auth });
}

// Podcast root folder from the project standards; overridable in Vercel.
export const PODCAST_ROOT_FALLBACK = "1WSkcgRhAH_Q7OWpNiosRBr7js6aqcItK";

export interface DropFile { id: string; name: string; modifiedTime: string }

/** Caption/transcript files in the Riverside drop folder (newest first). */
export async function listDropFiles(): Promise<DropFile[]> {
  const folder = process.env.DRIVE_DROP_FOLDER_ID;
  if (!folder) throw new Error("DRIVE_DROP_FOLDER_ID isn't set in Vercel yet.");
  const res = await driveClient().files.list({
    q: `'${folder}' in parents and trashed = false`,
    fields: "files(id, name, modifiedTime, mimeType)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files || [])
    .filter((f) => /\.(srt|vtt|txt)$/i.test(f.name || ""))
    .map((f) => ({ id: f.id!, name: f.name!, modifiedTime: f.modifiedTime || "" }));
}

/** Text content of one file in the drop folder (max ~3 MB). */
export async function readDropFile(fileId: string): Promise<{ name: string; text: string }> {
  const drive = driveClient();
  const meta = await drive.files.get({ fileId, fields: "id, name, size, parents", supportsAllDrives: true });
  const folder = process.env.DRIVE_DROP_FOLDER_ID;
  if (!folder || !(meta.data.parents || []).includes(folder)) throw new Error("That file isn't in the Riverside drop folder.");
  if (Number(meta.data.size || 0) > 3_000_000) throw new Error("That file is too large to be a transcript.");
  const res = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "text" });
  return { name: meta.data.name || "", text: String(res.data || "") };
}

/** Creates the standard episode folder with its two subfolders; returns the folder id + link. */
export async function createEpisodeFolders(folderName: string): Promise<{ id: string; url: string }> {
  const drive = driveClient();
  const root = process.env.DRIVE_PODCAST_ROOT_FOLDER_ID || PODCAST_ROOT_FALLBACK;
  const mk = async (name: string, parent: string) =>
    (await drive.files.create({
      requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parent] },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    })).data;
  const top = await mk(folderName, root);
  await mk("Main Podcast", top.id!);
  await mk("Magic Clips", top.id!);
  return { id: top.id!, url: top.webViewLink || `https://drive.google.com/drive/folders/${top.id}` };
}

/** Standard folder name (project standard): "Profit Streams Podcast (Host & Guest)". */
export function episodeFolderName(host: string, guest: string, episodeNumber?: string | null): string {
  const ep = (episodeNumber || "").trim();
  return `${ep ? `Ep-${ep.replace(/^ep-?/i, "")} ` : ""}Profit Streams Podcast (${host} & ${guest})`;
}
