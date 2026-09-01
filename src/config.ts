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
 * apps-script/SETUP.md, "Join wizard") that hasn't been done yet, so those
 * emails currently never arrive. Join and login both work fully without it —
 * only "Forgot password" and the "check your email to verify" message depend
 * on it — but promising an email that never comes is worse than not
 * mentioning it, so this flag hides those two UI surfaces until the Sender.net
 * side is actually configured. Flip back to true once it is; nothing else
 * needs to change.
 */
export const ACCOUNT_EMAILS_ENABLED = false;
