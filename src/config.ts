/**
 * Google Apps Script web app URL.
 *
 * This is the address the site fetches events and announcements from. It is
 * produced when you deploy the script bound to
 * "Turtle Rock Science Club — Website Content":
 *
 *   Apps Script editor ▸ Deploy ▸ New deployment ▸ Web app
 *     Execute as:      Me
 *     Who has access:  Anyone
 *
 * Paste the resulting /exec URL below. See apps-script/SETUP.md.
 *
 * While this is empty the site simply shows an empty state, so nothing
 * breaks before the Sheet is connected.
 */
export const SHEET_API_URL =
  'https://script.google.com/macros/s/AKfycbzRXhmifLCQON9FGLWvOLB749Hrj3Tev7kuCdCrH3wWGyOg5zn8N2a2XgMs48t4pMHKeg/exec';

/** How long a cached copy stays fresh before we re-fetch, in milliseconds. */
export const CONTENT_CACHE_MS = 5 * 60 * 1000;

/** localStorage key holding the last successful fetch. */
export const CONTENT_CACHE_KEY = 'tr_sc_sheet_content_v2';

/**
 * Verification/password-reset emails need a one-time Sender.net setup (a
 * custom `account_link` field plus two groups + automations — see
 * apps-script/SETUP.md, "Join wizard"). That setup is done and verification
 * emails are confirmed working, so this now gates in the "Forgot password?"
 * link and "check your email to verify" message alongside it.
 */
export const ACCOUNT_EMAILS_ENABLED = true;

/**
 * The Google Sheet the Admin Hub's "Backup Sheet" tab embeds as a raw,
 * always-available fallback view (see CLAUDE.md, "Content pipeline"). This
 * is the spreadsheet id, not a secret — viewing/editing it still requires a
 * Google account the sheet is actually shared with.
 */
export const GOOGLE_SHEET_ID = '1F-4w57Cehlh-55I8fmAzeYY0DUFYS2I6FpOfjjqUhV0';
