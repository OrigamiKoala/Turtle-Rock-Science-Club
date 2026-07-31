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
 * While this is empty the site simply shows the bundled content in data.ts, so
 * nothing breaks before the Sheet is connected.
 */
export const SHEET_API_URL =
  'https://script.google.com/macros/s/AKfycbzRXhmifLCQON9FGLWvOLB749Hrj3Tev7kuCdCrH3wWGyOg5zn8N2a2XgMs48t4pMHKeg/exec';

/** How long a cached copy stays fresh before we re-fetch, in milliseconds. */
export const CONTENT_CACHE_MS = 5 * 60 * 1000;

/** localStorage key holding the last successful fetch. */
export const CONTENT_CACHE_KEY = 'tr_sc_sheet_content_v1';
