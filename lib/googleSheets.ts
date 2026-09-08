import { google } from "googleapis";

// Server-side only. Authenticates as a Google service account (a machine
// login, not a person) that's been shared onto the target Sheet as an Editor.
// This never touches your personal Google account.
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Appends one row to the "Guest List" sheet tab. If GOOGLE_SHEET_ID isn't
 * set, this silently no-ops so local/dev testing doesn't require Sheets
 * access to be configured yet — same pattern as the Resend email skip.
 */
export async function appendGuestRow(row: (string | number)[]) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return; // not configured yet — skip quietly

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Guest List!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}
