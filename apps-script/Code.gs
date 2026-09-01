/**
 * Turtle Rock Science Club — Website Content Publisher
 * =====================================================
 * Bound to: "Turtle Rock Science Club — Website Content"
 * https://docs.google.com/spreadsheets/d/1F-4w57Cehlh-55I8fmAzeYY0DUFYS2I6FpOfjjqUhV0/edit
 *
 * WHAT THIS DOES
 *   Four tabs drive the website:
 *
 *     Events         — what shows under "Upcoming Events"
 *     Announcements  — what shows under "Club Announcements"
 *     Lab Log        — the write-ups under "Latest From the Lab Log"
 *     Signups        — filled in automatically when someone signs up online
 *     Newsletter     — filled in automatically; mirrored into Sender.net
 *
 *   Click  🐢 Website ▸ Publish to Website  and the site picks up your changes.
 *   Nothing you type goes live until you press Publish, so a half-finished
 *   event can sit in the sheet without appearing publicly.
 *
 *   Signups are the deliberate exception and are live: when a student signs up
 *   on the site, this script appends a row to Signups, adds 1 to that event's
 *   "Spots Taken", and nudges the published copy so the "spots left" counter on
 *   the site stays honest — without publishing anything you may still be
 *   drafting.
 *
 *   Newsletter sign-ups are live too. The footer box and the Join form both
 *   write to the Newsletter tab and push the address to Sender.net, so the next
 *   campaign you send reaches them. See "Newsletter — Sender.net" below; the
 *   API token is configured through 🐢 Website ▸ ✉️ Newsletter, never in code.
 *
 * SETUP — see SETUP.md for the click-by-click version.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var EVENTS_SHEET = 'Events';
var ANNOUNCEMENTS_SHEET = 'Announcements';
var LABLOG_SHEET = 'Lab Log';
var PHOTOS_SHEET = 'Photos';
var RESOURCES_SHEET = 'Resources';
var MEMBERS_SHEET = 'Members';
var SIGNUPS_SHEET = 'Signups';
var NEWSLETTER_SHEET = 'Newsletter';
var PUBLISHED_SHEET = '_Published';

var RESOURCE_HEADERS = ['Title', 'Description', 'Category', 'Level', 'URL', 'Type', 'Show on Site'];
var RESOURCE_LEVELS = ['Elementary', 'Middle School', 'High School', 'All Levels'];

var EVENT_HEADERS = [
  'Title',
  'Date',
  'Time',
  'Location',
  'Description',
  'Spots Total',
  'Spots Taken',
  'Image URL',
  'Show on Site',
  'Done',
  'Photos'
];

var ANNOUNCEMENT_HEADERS = ['Title', 'Date', 'Category', 'Content', 'Show on Site'];

var LABLOG_HEADERS = [
  'Title',
  'Date',
  'Category',
  'Summary',
  'Full Write-Up',
  'Image URL',
  'Author',
  'Show on Site'
];

var SIGNUP_HEADERS = ['Timestamp', 'Event', 'Student Name', 'School'];
var MEMBER_HEADERS = [
  'Timestamp',
  'Scientist Name',
  'School',
  'Role',
  'Guardian Name',
  'Parent Email',
  'Grade',
  'Level',
  'XP',
  'Unlocked Badges',
  'Reserved Missions',
  'Student Email',
  'Newsletter Opt-In',
  'Password Hash',
  'Email Verified',
  'Account Token',
  'Account Token Type',
  'Account Token Expires',
  'Session Token',
  'Session Token Expires',
  'Parent 1 Phone',
  'Parent 2 Name',
  'Parent 2 Email',
  'Parent 2 Phone',
  'Video Consent',
  'Liability Waiver Consent'
];

// 0-based positions matching a `bodyRows_(members, MEMBER_HEADERS.length)` row.
var MEM_IDX_TIMESTAMP = 0;
var MEM_IDX_NAME = 1;
var MEM_IDX_SCHOOL = 2;
var MEM_IDX_ROLE = 3;
var MEM_IDX_GUARDIAN_NAME = 4;
var MEM_IDX_PARENT_EMAIL = 5;
var MEM_IDX_GRADE = 6;
var MEM_IDX_LEVEL = 7;
var MEM_IDX_XP = 8;
var MEM_IDX_BADGES = 9;
var MEM_IDX_MISSIONS = 10;
var MEM_IDX_STUDENT_EMAIL = 11;
var MEM_IDX_NEWSLETTER_OPTIN = 12;
var MEM_IDX_PASSWORD_HASH = 13;
var MEM_IDX_EMAIL_VERIFIED = 14;
var MEM_IDX_ACCOUNT_TOKEN = 15;
var MEM_IDX_ACCOUNT_TOKEN_TYPE = 16;
var MEM_IDX_ACCOUNT_TOKEN_EXPIRES = 17;
var MEM_IDX_SESSION_TOKEN = 18;
var MEM_IDX_SESSION_TOKEN_EXPIRES = 19;
var MEM_IDX_PARENT1_PHONE = 20;
var MEM_IDX_PARENT2_NAME = 21;
var MEM_IDX_PARENT2_EMAIL = 22;
var MEM_IDX_PARENT2_PHONE = 23;
var MEM_IDX_VIDEO_CONSENT = 24;
var MEM_IDX_WAIVER_CONSENT = 25;

// The same positions, 1-based, for `sheet.getRange(row, col)`.
var MEM_COL_LEVEL = MEM_IDX_LEVEL + 1;
var MEM_COL_XP = MEM_IDX_XP + 1;
var MEM_COL_BADGES = MEM_IDX_BADGES + 1;
var MEM_COL_MISSIONS = MEM_IDX_MISSIONS + 1;
var MEM_COL_PASSWORD_HASH = MEM_IDX_PASSWORD_HASH + 1;
var MEM_COL_EMAIL_VERIFIED = MEM_IDX_EMAIL_VERIFIED + 1;
var MEM_COL_ACCOUNT_TOKEN = MEM_IDX_ACCOUNT_TOKEN + 1;
var MEM_COL_ACCOUNT_TOKEN_TYPE = MEM_IDX_ACCOUNT_TOKEN_TYPE + 1;
var MEM_COL_ACCOUNT_TOKEN_EXPIRES = MEM_IDX_ACCOUNT_TOKEN_EXPIRES + 1;
var MEM_COL_SESSION_TOKEN = MEM_IDX_SESSION_TOKEN + 1;
var MEM_COL_SESSION_TOKEN_EXPIRES = MEM_IDX_SESSION_TOKEN_EXPIRES + 1;

var PHOTO_HEADERS = ['Title', 'Image URL', 'Caption', 'Category', 'Submitted By', 'Show on Site'];

var NEWSLETTER_HEADERS = [
  'Timestamp',
  'Email',
  'Name',
  'Source',
  'Sender Groups',
  'Sender Status',
  'Last Attempt'
];

// Column positions in the Newsletter sheet (1-based).
var NL_COL_TIMESTAMP = 1;
var NL_COL_EMAIL = 2;
var NL_COL_NAME = 3;
var NL_COL_SOURCE = 4;
var NL_COL_GROUPS = 5;
var NL_COL_STATUS = 6;
var NL_COL_ATTEMPT = 7;

// Values written into the "Sender Status" column. Anything that is not
// STATUS_SUBSCRIBED is retried by 🔁 Sync Pending Subscribers.
var STATUS_SUBSCRIBED = 'Subscribed';
var STATUS_PENDING = 'Pending — no API key';

var ANNOUNCEMENT_CATEGORIES = ['general', 'expansion', 'toolkit', 'volunteer'];
var LABLOG_CATEGORIES = ['chemistry', 'robotics', 'astronomy', 'general'];
var PHOTO_CATEGORIES = ['experiments', 'field-trips', 'lab-meetings'];
var RESOURCE_CATEGORIES = ['chemistry', 'physics', 'astronomy', 'biology', 'robotics', 'general'];

var BRAND_DARK = '#064e3b';
var SIGNUP_HEADER_COLOR = '#1e3a8a';
var NEWSLETTER_HEADER_COLOR = '#7c2d12';

// ---------------------------------------------------------------------------
// Account security — passwords, one-time tokens, sessions
// ---------------------------------------------------------------------------
//
// Apps Script has no bcrypt/Argon2. `stretch_` stretches a salted password
// through rounds of HMAC-SHA256 instead — not as strong as a real
// password-hashing function, but stronger than a single unsalted digest, and
// it's the strongest primitive this platform actually offers.
// A stored hash is `salt:iterations:hex` — self-describing, so the iteration
// count can change without invalidating hashes already written (and
// handleLogin_ opportunistically re-hashes at the current count on a
// successful login, so an old, slower hash upgrades itself over time).
//
// The count matters more here than on a normal server: Apps Script's
// `Utilities.computeHmacSha256Signature` has real per-call overhead (this
// isn't a tight V8 loop), so what would be an unnoticeable 10,000 rounds
// elsewhere measured at ~19 SECONDS for one login on the actual deployment —
// exactly the "login/join just hangs" bug this fixes. 200 rounds measured
// well under a second there and is what's actually shipped below.
var PASSWORD_HASH_ITERATIONS = 200;
var SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
var ACCOUNT_TOKEN_TTL_MS = {
  verify: 7 * 24 * 60 * 60 * 1000, // 7 days
  reset: 60 * 60 * 1000 // 1 hour — a reset link is far more sensitive
};

function bytesToHex_(bytes) {
  return bytes
    .map(function (b) {
      return ('0' + (b & 0xff).toString(16)).slice(-2);
    })
    .join('');
}

function stretch_(password, salt, iterations) {
  var value = String(password);
  for (var i = 0; i < iterations; i++) {
    value = bytesToHex_(Utilities.computeHmacSha256Signature(value, salt));
  }
  return value;
}

function makePasswordHash_(password) {
  var salt = Utilities.getUuid();
  var digest = stretch_(password, salt, PASSWORD_HASH_ITERATIONS);
  return salt + ':' + PASSWORD_HASH_ITERATIONS + ':' + digest;
}

/** Constant-time-ish comparison so a failed check can't be timed character by character. */
function timingSafeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function verifyPassword_(password, stored) {
  var parts = String(stored || '').split(':');
  if (parts.length !== 3) return false;

  var salt = parts[0];
  var iterations = parseInt(parts[1], 10) || PASSWORD_HASH_ITERATIONS;
  var expected = parts[2];
  return timingSafeEqual_(stretch_(password, salt, iterations), expected);
}

/** A long random opaque string, used for both account-action and session tokens. */
function generateToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** Prefers the guardian's address; falls back to the student's own. */
function pickAccountEmail_(parentEmail, studentEmail) {
  var parent = String(parentEmail || '').trim();
  if (isEmail_(parent)) return parent;
  var student = String(studentEmail || '').trim();
  if (isEmail_(student)) return student;
  return '';
}

/** Writes a fresh verify/reset token onto a Members row and returns it. */
function issueAccountToken_(members, sheetRow, type) {
  var token = generateToken_();
  var expires = new Date(Date.now() + ACCOUNT_TOKEN_TTL_MS[type]);
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN).setValue(token);
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN_TYPE).setValue(type);
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN_EXPIRES).setValue(expires);
  return token;
}

function clearAccountToken_(members, sheetRow) {
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN).setValue('');
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN_TYPE).setValue('');
  members.getRange(sheetRow, MEM_COL_ACCOUNT_TOKEN_EXPIRES).setValue('');
}

function tokenExpired_(expiresCell) {
  return expiresCell instanceof Date && expiresCell.getTime() < Date.now();
}

// Failed-login throttling lives in CacheService, not the sheet: it's
// self-expiring and needs no schema, and a lockout only ever needs to survive
// minutes, not the life of the account.
var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_LOCKOUT_SECONDS = 15 * 60;

function loginAttemptsKey_(identifier) {
  return 'login_attempts_' + String(identifier).toLowerCase().trim();
}

function isLoginLocked_(identifier) {
  var count = Number(CacheService.getScriptCache().get(loginAttemptsKey_(identifier))) || 0;
  return count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin_(identifier) {
  var cache = CacheService.getScriptCache();
  var key = loginAttemptsKey_(identifier);
  var count = (Number(cache.get(key)) || 0) + 1;
  cache.put(key, String(count), LOGIN_LOCKOUT_SECONDS);
}

function clearLoginAttempts_(identifier) {
  CacheService.getScriptCache().remove(loginAttemptsKey_(identifier));
}

// ---------------------------------------------------------------------------
// Sender.net (newsletter)
// ---------------------------------------------------------------------------
//
// The API token is a secret and must never reach the website bundle, which is
// public. It lives in this script's Script Properties instead, and the browser
// only ever talks to this web app — this script is what talks to Sender.
//
// Set it through  🐢 Website ▸ ✉️ Newsletter ▸ 🔑  (never by typing it here,
// which would commit the token into the repo).
//
// Addresses are routed to Sender groups by where they came from — see
// SENDER_AUDIENCE_GROUPS below. The groups are looked up by title and created
// if they do not exist yet, so there is nothing to configure beyond the token;
// the resolved ids are cached in Script Properties so the common path is a
// single API call.

var SENDER_API_BASE = 'https://api.sender.net/v2';
var SENDER_TOKEN_PROPERTY = 'SENDER_API_TOKEN';
var SENDER_GROUP_PROPERTY_PREFIX = 'SENDER_GROUP_ID_';

// Address used by 🧪 Test Sender Connection to check that writing works.
// example.com is reserved by the IANA, so this can never be a real person.
var SENDER_PROBE_EMAIL = 'trsc-connection-test@example.com';

var AUDIENCE_PARENT = 'parent';
var AUDIENCE_STUDENT = 'student';
var AUDIENCE_NEWSLETTER = 'newsletter';

var GROUP_PARENTS = 'Parents';
var GROUP_STUDENTS = 'Students';
var GROUP_NEWSLETTER = 'Newsletter';

/**
 * Audience → every Sender.net group that audience belongs in.
 *
 * Club members land in both their own group and Newsletter, so a campaign can
 * target parents or students specifically, and a general newsletter to the
 * Newsletter group still reaches everyone. Someone who only used the footer box
 * gets Newsletter alone — they did not join the club.
 */
var SENDER_AUDIENCE_GROUPS = {
  parent: [GROUP_PARENTS, GROUP_NEWSLETTER],
  student: [GROUP_STUDENTS, GROUP_NEWSLETTER],
  newsletter: [GROUP_NEWSLETTER]
};

/** Every group this script manages, for the setup and repair menu items. */
var SENDER_GROUP_TITLES = [GROUP_PARENTS, GROUP_STUDENTS, GROUP_NEWSLETTER];

// Column positions in the Events sheet (1-based), used by the signup handler.
var EVENT_COL_TITLE = 1;
var EVENT_COL_SPOTS_TOTAL = 6;
var EVENT_COL_SPOTS_TAKEN = 7;

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/** Simple trigger: builds the custom menu every time the sheet is opened. */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  var newsletter = ui
    .createMenu('✉️ Newsletter')
    .addItem('🔑 Set Sender.net API Token', 'setSenderApiToken')
    .addItem('👥 Show / Repair Sender Groups', 'showSenderGroups')
    .addSeparator()
    .addItem('🧪 Test Sender Connection', 'testSenderConnection')
    .addItem('🔁 Sync Pending Subscribers', 'syncNewsletterToSender');

  ui.createMenu('🐢 Website')
    .addItem('🚀 Publish to Website', 'publishToWebsite')
    .addSeparator()
    .addItem('🔗 Show Web App URL', 'showWebAppUrl')
    .addItem('👀 Preview Published JSON', 'previewPublishedJson')
    .addSeparator()
    .addSubMenu(newsletter)
    .addSeparator()
    .addItem('⚙️ Set Up / Repair Sheets', 'setupSheets')
    .addToUi();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Creates (or repairs) every tab the website needs.
 * Safe to re-run: it never deletes rows you have typed.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var events = ensureSheet_(ss, EVENTS_SHEET, EVENT_HEADERS, BRAND_DARK);
  var announcements = ensureSheet_(ss, ANNOUNCEMENTS_SHEET, ANNOUNCEMENT_HEADERS, BRAND_DARK);
  var labLog = ensureSheet_(ss, LABLOG_SHEET, LABLOG_HEADERS, BRAND_DARK);
  var photos = ensureSheet_(ss, PHOTOS_SHEET, PHOTO_HEADERS, BRAND_DARK);
  var resources = ensureSheet_(ss, RESOURCES_SHEET, RESOURCE_HEADERS, BRAND_DARK);
  var members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
  var signups = ensureSheet_(ss, SIGNUPS_SHEET, SIGNUP_HEADERS, SIGNUP_HEADER_COLOR);
  var newsletter = ensureSheet_(ss, NEWSLETTER_SHEET, NEWSLETTER_HEADERS, NEWSLETTER_HEADER_COLOR);

  styleEventsSheet_(events);
  styleAnnouncementsSheet_(announcements);
  styleLabLogSheet_(labLog);
  stylePhotosSheet_(photos);
  styleResourcesSheet_(resources);
  styleMembersSheet_(members);
  styleSignupsSheet_(signups);
  styleNewsletterSheet_(newsletter);

  var stray = ss.getSheetByName('Sheet1');
  if (stray && stray.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(stray);
  }

  ensurePublishedSheet_(ss);
  ss.setActiveSheet(events);

  notify_(
    'Setup complete',
    'Your tabs are ready:\n\n' +
      '  • Events\n  • Announcements\n  • Lab Log\n  • Photos\n  • Resources\n  • Members (filled in automatically)\n' +
      '  • Signups (filled in automatically)\n  • Newsletter (filled in automatically)\n\n' +
      'Type your content, then click  🐢 Website ▸ Publish to Website.'
  );
}

/**
 * Shows a dialog when there is a UI to show it in.
 *
 * setupSheets is meant to be run straight from the Apps Script editor the first
 * time, and there is no spreadsheet UI attached to that context — calling
 * getUi() there throws. The setup work itself is already done by this point, so
 * a missing dialog must not surface as a failure.
 */
function notify_(title, message) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (err) {
    Logger.log(title + '\n' + message);
  }
}

function ensureSheet_(ss, name, headers, headerColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // If repairing an existing Resources sheet that was created with 6 columns
    if (name === RESOURCES_SHEET) {
      var lastC = Math.max(1, sheet.getLastColumn());
      var currentHeaders = sheet.getRange(1, 1, 1, lastC).getValues()[0];
      var hasLevel = false;
      for (var k = 0; k < currentHeaders.length; k++) {
        if (String(currentHeaders[k] || '').trim().toLowerCase() === 'level') {
          hasLevel = true;
          break;
        }
      }
      if (!hasLevel && lastC >= 4) {
        sheet.insertColumnAfter(3);
        sheet.getRange(1, 4).setValue('Level');
        var lastR = sheet.getLastRow();
        if (lastR >= 2) {
          sheet.getRange(2, 4, lastR - 1, 1).setValue('All Levels');
        }
      }
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1, 1, headers.length)
    .setBackground(headerColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);
  return sheet;
}

function styleEventsSheet_(sheet) {
  setWidths_(sheet, [220, 130, 170, 220, 420, 90, 90, 300, 100, 80, 250]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');

  var wholeNumber = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setAllowInvalid(false)
    .setHelpText('Enter a whole number of spots (0 or more).')
    .build();
  sheet.getRange(2, EVENT_COL_SPOTS_TOTAL, body, 2).setDataValidation(wholeNumber);

  sheet.getRange(2, 9, body, 1).insertCheckboxes();
  sheet.getRange(2, 10, body, 1).insertCheckboxes();
  sheet.getRange(2, 5, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, EVENT_HEADERS.length).setVerticalAlignment('top');
}

function styleAnnouncementsSheet_(sheet) {
  setWidths_(sheet, [260, 130, 130, 560, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(ANNOUNCEMENT_CATEGORIES, sheet, 3));
  sheet.getRange(2, 5, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, ANNOUNCEMENT_HEADERS.length).setVerticalAlignment('top');
}

function styleLabLogSheet_(sheet) {
  setWidths_(sheet, [240, 130, 130, 380, 460, 300, 180, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(LABLOG_CATEGORIES, sheet, 3));
  sheet.getRange(2, 8, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 2).setWrap(true);
  sheet.getRange(1, 1, body + 1, LABLOG_HEADERS.length).setVerticalAlignment('top');
}

function styleSignupsSheet_(sheet) {
  setWidths_(sheet, [180, 260, 220, 260]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;
  sheet.getRange(2, 1, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, body + 1, SIGNUP_HEADERS.length).setVerticalAlignment('top');
}

function styleNewsletterSheet_(sheet) {
  setWidths_(sheet, [180, 280, 200, 190, 180, 260, 180]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;
  sheet.getRange(2, NL_COL_TIMESTAMP, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(2, NL_COL_ATTEMPT, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, body + 1, NEWSLETTER_HEADERS.length).setVerticalAlignment('top');
}

function styleMembersSheet_(sheet) {
  setWidths_(sheet, [180, 200, 240, 180, 200, 240, 80, 80, 80, 260, 260, 220, 100, 90, 90, 70, 90, 140, 70, 140, 140, 200, 240, 140, 90, 130]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;
  sheet.getRange(2, 1, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, body + 1, MEMBER_HEADERS.length).setVerticalAlignment('top');
}

function stylePhotosSheet_(sheet) {
  setWidths_(sheet, [220, 320, 400, 140, 180, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 4, body, 1).setDataValidation(categoryRule_(PHOTO_CATEGORIES, sheet, 4));
  sheet.getRange(2, 6, body, 1).insertCheckboxes();
  sheet.getRange(2, 3, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, PHOTO_HEADERS.length).setVerticalAlignment('top');
}

function styleResourcesSheet_(sheet) {
  setWidths_(sheet, [240, 420, 140, 140, 300, 120, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(RESOURCE_CATEGORIES, sheet, 3));
  sheet.getRange(2, 4, body, 1).setDataValidation(categoryRule_(RESOURCE_LEVELS, sheet, 4));
  sheet.getRange(2, 7, body, 1).insertCheckboxes();
  sheet.getRange(2, 2, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, RESOURCE_HEADERS.length).setVerticalAlignment('top');
}

function setWidths_(sheet, widths) {
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

function categoryRule_(values, sheet, col) {
  var list = values.slice();
  if (sheet && col) {
    try {
      var lastR = sheet.getLastRow();
      if (lastR >= 2) {
        var existing = sheet.getRange(2, col, lastR - 1, 1).getValues();
        for (var i = 0; i < existing.length; i++) {
          var val = String(existing[i][0] || '').trim();
          if (val && list.indexOf(val) === -1) {
            list.push(val);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(true)
    .setHelpText('Pick or type a category — custom entries are preserved on repair.')
    .build();
}

function ensurePublishedSheet_(ss) {
  var sheet = ss.getSheetByName(PUBLISHED_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PUBLISHED_SHEET);
    sheet.getRange('A1').setValue('');
    sheet
      .getRange('C1')
      .setValue('Written automatically when you click Publish. Do not edit by hand.');
    sheet.hideSheet();
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

function publishToWebsite() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var eventsSheet = ss.getSheetByName(EVENTS_SHEET);
  var announcementsSheet = ss.getSheetByName(ANNOUNCEMENTS_SHEET);
  var labLogSheet = ss.getSheetByName(LABLOG_SHEET);
  var photosSheet = ss.getSheetByName(PHOTOS_SHEET);
  var resourcesSheet = ss.getSheetByName(RESOURCES_SHEET);

  if (!eventsSheet || !announcementsSheet) {
    ui.alert(
      'Missing tabs',
      'I could not find the "Events" and "Announcements" tabs.\n\n' +
        'Run  🐢 Website ▸ Set Up / Repair Sheets  first.',
      ui.ButtonSet.OK
    );
    return;
  }

  var problems = [];
  var eventsData = readEvents_(eventsSheet, problems);
  var events = eventsData.events;
  var eventPhotos = eventsData.eventPhotos;
  var announcements = readAnnouncements_(announcementsSheet, problems);
  var labLogs = labLogSheet ? readLabLogs_(labLogSheet, problems) : [];
  var photosList = photosSheet ? readPhotos_(photosSheet, problems) : [];
  var resourcesList = resourcesSheet ? readResources_(resourcesSheet, problems) : [];

  if (problems.length) {
    var response = ui.alert(
      'Found ' + problems.length + ' problem(s)',
      problems.slice(0, 10).join('\n') +
        (problems.length > 10 ? '\n…and ' + (problems.length - 10) + ' more.' : '') +
        '\n\nPublish anyway, skipping those rows?',
      ui.ButtonSet.YES_NO
    );
    if (response !== ui.Button.YES) return;
  }

  var payload = {
    events: events,
    announcements: announcements,
    labLogs: labLogs,
    eventPhotos: eventPhotos,
    photos: photosList,
    resources: resourcesList,
    publishedAt: new Date().toISOString(),
    publishedBy: Session.getActiveUser().getEmail() || 'unknown'
  };

  var json = JSON.stringify(payload);

  if (json.length > 45000) {
    ui.alert(
      'Too much content',
      'The published data is ' + json.length + ' characters, close to the 50,000 ' +
        'character limit of a single cell.\n\nUntick "Show on Site" on some older ' +
        'rows and publish again.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Same lock handleSignup_/bumpPublishedSpots_ take before touching
  // _Published!A1 — without it, a signup landing mid-publish could have its
  // spot-count bump silently clobbered by this (older) snapshot, or this
  // publish could get clobbered right back by a signup's bump. Scoped to just
  // the write itself (not the dialogs above), so an admin sitting on the
  // confirmation prompt doesn't block a student trying to sign up.
  var publishLock = LockService.getScriptLock();
  try {
    publishLock.waitLock(15000);
  } catch (err) {
    ui.alert('Server busy', 'Could not get a lock to publish. Please try again in a moment.', ui.ButtonSet.OK);
    return;
  }

  try {
    ensurePublishedSheet_(ss).getRange('A1').setValue(json);
  } finally {
    publishLock.releaseLock();
  }

  ui.alert(
    '🚀 Published!',
    'The website now shows:\n\n' +
      '  • ' + events.length + ' active event(s)\n' +
      '  • ' + photosList.length + ' direct photo(s)\n' +
      '  • ' + eventPhotos.length + ' photo album(s)\n' +
      '  • ' + announcements.length + ' announcement(s)\n' +
      '  • ' + labLogs.length + ' lab log entr(ies)\n' +
      '  • ' + resourcesList.length + ' resource(s)\n\n' +
      (problems.length ? '  • ' + problems.length + ' row(s) skipped\n\n' : '') +
      'Refresh the website to see the change.',
    ui.ButtonSet.OK
  );
}

function readEvents_(sheet, problems) {
  var rows = bodyRows_(sheet, EVENT_HEADERS.length);
  var events = [];
  var eventPhotos = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;
    if (row[8] === false) continue;

    var title = String(row[0]).trim();
    if (!title) {
      problems.push('Events row ' + rowNumber + ': missing a Title.');
      continue;
    }

    var total = toWholeNumber_(row[5], 0);
    var taken = toWholeNumber_(row[6], 0);
    // A bad Spots Taken/Total pair should hide the (now-nonsensical) event
    // listing, but Photos is an unrelated column — a data-entry typo here
    // must not also take down that event's whole photo album until someone
    // notices and fixes it.
    var spotsInvalid = taken > total;
    if (spotsInvalid) {
      problems.push(
        'Events row ' + rowNumber + ' ("' + title + '"): Spots Taken (' + taken +
          ') is more than Spots Total (' + total + ').'
      );
    }

    var isDone = row[9] === true;
    var photosValue = String(row[10] || '').trim();

    if (photosValue) {
      var isHtml = photosValue.indexOf('<') !== -1;
      eventPhotos.push({
        id: 'sheet-photo-' + rowNumber,
        title: title,
        date: formatDate_(row[1]),
        description: String(row[4] || '').trim() || ('Photo album for ' + title),
        albumUrl: isHtml ? '' : photosValue,
        albumEmbed: photosValue,
        image: String(row[7] || '').trim()
      });
    }

    if (spotsInvalid || isDone) continue;

    events.push({
      id: 'sheet-event-' + rowNumber,
      title: title,
      date: formatDate_(row[1]),
      time: String(row[2] || '').trim(),
      location: String(row[3] || '').trim(),
      description: String(row[4] || '').trim(),
      spotsTotal: total,
      spotsReserved: taken,
      image: String(row[7] || '').trim(),
      done: isDone,
      photos: photosValue,
      albumEmbed: photosValue
    });
  }

  return {
    events: events,
    eventPhotos: eventPhotos
  };
}

function readPhotos_(sheet, problems) {
  var rows = bodyRows_(sheet, PHOTO_HEADERS.length);
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;
    if (row[5] === false) continue;

    var title = String(row[0]).trim();
    var imageUrl = String(row[1] || '').trim();

    if (!title && !imageUrl) {
      problems.push('Photos row ' + rowNumber + ': missing Title or Image URL.');
      continue;
    }

    out.push({
      id: 'sheet-direct-photo-' + rowNumber,
      title: title || 'Science Moment',
      imageUrl: imageUrl,
      caption: String(row[2] || '').trim(),
      description: String(row[2] || '').trim(),
      category: String(row[3] || '').trim().toLowerCase() || 'experiments',
      submittedBy: String(row[4] || '').trim() || 'Turtle Rock Science Club',
      date: formatDate_(new Date())
    });
  }

  return out;
}

function readAnnouncements_(sheet, problems) {
  var rows = bodyRows_(sheet, ANNOUNCEMENT_HEADERS.length);
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;
    if (row[4] === false) continue;

    var title = String(row[0]).trim();
    if (!title) {
      problems.push('Announcements row ' + rowNumber + ': missing a Title.');
      continue;
    }

    out.push({
      id: 'sheet-ann-' + rowNumber,
      title: title,
      date: formatDate_(row[1]),
      category: String(row[2] || '').trim().toLowerCase() || 'general',
      content: String(row[3] || '').trim()
    });
  }

  return out;
}

function readLabLogs_(sheet, problems) {
  var rows = bodyRows_(sheet, LABLOG_HEADERS.length);
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;
    if (row[7] === false) continue;

    var title = String(row[0]).trim();
    if (!title) {
      problems.push('Lab Log row ' + rowNumber + ': missing a Title.');
      continue;
    }

    var summary = String(row[3] || '').trim();
    var content = String(row[4] || '').trim();

    out.push({
      id: 'sheet-log-' + rowNumber,
      title: title,
      date: formatDate_(row[1]),
      category: String(row[2] || '').trim().toLowerCase() || 'general',
      // The card shows the summary and the expanded view shows the write-up, so
      // fall back between them rather than rendering an empty card.
      summary: summary || content,
      content: content || summary,
      image: String(row[5] || '').trim(),
      author: String(row[6] || '').trim()
    });
  }

  return out;
}

function readResources_(sheet, problems) {
  var lastCol = sheet.getLastColumn();
  var width = Math.max(lastCol, RESOURCE_HEADERS.length);
  var rows = bodyRows_(sheet, width);
  var out = [];

  // Which column layout this sheet uses is a structural fact — whether row 1
  // actually has a "Level" header — not something to guess from a cell's
  // content. A Level value like "gr.5" (a dot, no space) used to be
  // misdetected as a URL by a content-sniffing heuristic, silently swapping
  // Level and URL for that row.
  var headerRow = sheet.getRange(1, 1, 1, Math.max(1, lastCol)).getValues()[0];
  var hasLevelColumn = false;
  for (var h = 0; h < headerRow.length; h++) {
    if (String(headerRow[h] || '').trim().toLowerCase() === 'level') {
      hasLevelColumn = true;
      break;
    }
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;

    var title = String(row[0] || '').trim();
    if (!title) {
      problems.push('Resources row ' + rowNumber + ': missing a Title.');
      continue;
    }

    var col3 = String(row[3] || '').trim();
    var col4 = String(row[4] || '').trim();
    var col5 = String(row[5] || '').trim();

    var level = 'all';
    var url = '';
    var type = 'website';
    var showOnSite = true;

    if (hasLevelColumn) {
      // 7-column sheet: Title, Description, Category, Level, URL, Type, Show on Site
      level = col3 || 'all';
      url = col4 || col3;
      type = col5 || 'website';
      showOnSite = row[6] !== false;
    } else {
      // 6-column sheet: Title, Description, Category, URL, Type, Show on Site
      url = col3;
      type = col4 || 'website';
      showOnSite = row[5] !== false;
    }

    if (!url) {
      problems.push('Resources row ' + rowNumber + ' ("' + title + '"): missing a URL.');
      continue;
    }

    if (!showOnSite) continue;

    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
      url = 'https://' + url;
    }

    out.push({
      id: 'sheet-resource-' + rowNumber,
      title: title,
      description: String(row[1] || '').trim(),
      category: String(row[2] || '').trim().toLowerCase() || 'general',
      level: level.toLowerCase(),
      url: url,
      type: type.toLowerCase()
    });
  }

  return out;
}

function normaliseCategory_(value, allowed) {
  var category = String(value || '').trim().toLowerCase();
  return allowed.indexOf(category) === -1 ? allowed[allowed.length - 1] : category;
}

function bodyRows_(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) {
    // Checkboxes read as false on an otherwise empty row, so they are not content.
    if (row[i] !== '' && row[i] !== null && row[i] !== false) return false;
  }
  return true;
}

function toWholeNumber_(value, fallback) {
  var n = Number(value);
  if (!isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

/** Sheets returns a Date for date-formatted cells and a string otherwise. */
function formatDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
      'MMMM d, yyyy'
    );
  }
  return String(value || '').trim();
}

// ---------------------------------------------------------------------------
// Web app
// ---------------------------------------------------------------------------

function doGet(e) {
  var json = readPublishedJson_();

  if (!json) {
    json = JSON.stringify({
      events: [],
      announcements: [],
      labLogs: [],
      eventPhotos: [],
      photos: [],
      publishedAt: null,
      note: 'Nothing published yet. Open the spreadsheet and click 🐢 Website ▸ Publish to Website.'
    });
  }

  return serve_(json, e);
}

/**
 * Signups arrive here.
 *
 * The website sends `text/plain` on purpose: it is a CORS-safelisted content
 * type, so the browser skips the preflight OPTIONS request that Apps Script web
 * apps cannot answer.
 */
function doPost(e) {
  var result;

  try {
    var body = e && e.postData ? JSON.parse(e.postData.contents) : {};
    if (body.action === 'signup') {
      result = handleSignup_(body);
    } else if (body.action === 'join') {
      result = handleJoin_(body);
    } else if (body.action === 'login') {
      result = handleLogin_(body);
    } else if (body.action === 'syncProfile') {
      result = handleSyncProfile_(body);
    } else if (body.action === 'verifyEmail') {
      result = handleVerifyEmail_(body);
    } else if (body.action === 'requestPasswordReset') {
      result = handleRequestPasswordReset_(body);
    } else if (body.action === 'resetPassword') {
      result = handleResetPassword_(body);
    } else if (body.action === 'logout') {
      result = handleLogout_(body);
    } else if (body.action === 'subscribe') {
      result = handleSubscribe_(body);
    } else {
      throw new Error('Unknown action.');
    }
  } catch (err) {
    result = { ok: false, error: err && err.message ? err.message : 'Action failed.' };
  }

  return serve_(JSON.stringify(result), e);
}

function handleJoin_(body) {
  var name = String(body.name || body.childName || '').trim();
  var school = String(body.school || '').trim();
  var role = String(body.role || 'Rookie Researcher').trim();
  var parentName = String(body.parentName || '').trim();
  var email = String(body.email || body.parentEmail || '').trim();
  var studentEmail = String(body.studentEmail || '').trim();
  // The field has always meant grade; `childAge` is the old wire name. Keep
  // reading it — the script and the site deploy independently, so a visitor on
  // a cached bundle would otherwise write a blank cell.
  var childGrade = String(body.childGrade || body.childAge || '').trim();
  // Replicates the club's Saturday Science Seminars registration form, which
  // used to live on a separate Google Form/Sheet — these all land in the
  // same Members row as everything else now.
  var parent1Phone = String(body.parent1Phone || '').trim();
  var parent2Name = String(body.parent2Name || '').trim();
  var parent2Email = String(body.parent2Email || '').trim();
  var parent2Phone = String(body.parent2Phone || '').trim();
  var videoConsent = String(body.videoConsent || '').trim();
  var waiverConsent = String(body.waiverConsent || '').trim();
  // JSON gives a real boolean, but be tolerant of a stringified one so a
  // hand-built POST or an older client can't accidentally read as consent.
  var newsletterOptIn =
    body.newsletterOptIn === true || String(body.newsletterOptIn).toLowerCase() === 'true';
  var password = String(body.password || '');

  if (!name) return { ok: false, error: 'Please enter a name.' };
  if (!school) return { ok: false, error: 'Please enter a school.' };
  if (!childGrade) return { ok: false, error: 'Please enter a grade.' };
  if (!studentEmail) return { ok: false, error: "Please enter the student's email." };
  if (!parentName) return { ok: false, error: "Please enter Parent 1's name." };
  if (!email) return { ok: false, error: "Please enter Parent 1's email." };
  if (!parent1Phone) return { ok: false, error: "Please enter Parent 1's phone number." };
  if (videoConsent !== 'Agree' && videoConsent !== 'Disagree') {
    return { ok: false, error: 'Please answer the video consent question.' };
  }
  if (waiverConsent !== 'Agree' && waiverConsent !== 'Disagree (Will Not Participate)') {
    return { ok: false, error: 'Please answer the waiver question.' };
  }
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) {
    members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
    styleMembersSheet_(members);
  }

  var passwordHash = makePasswordHash_(password);
  var sessionToken = generateToken_();
  var sessionExpires = new Date(Date.now() + SESSION_DURATION_MS);
  var accountToken = generateToken_();
  var accountTokenExpires = new Date(Date.now() + ACCOUNT_TOKEN_TTL_MS.verify);
  var joinedAt = new Date();

  members.appendRow([
    joinedAt, name, school, role, parentName, email, childGrade, 1, 15,
    'Foundation Member', '', studentEmail, newsletterOptIn,
    passwordHash, false, accountToken, 'verify', accountTokenExpires,
    sessionToken, sessionExpires,
    parent1Phone, parent2Name, parent2Email, parent2Phone, videoConsent, waiverConsent
  ]);

  // Joining still logs the student in immediately — the unverified email only
  // blocks a future password-reset request, not first use.
  var verifyEmailAddress = pickAccountEmail_(email, studentEmail);
  var needsVerification = !!verifyEmailAddress;
  if (verifyEmailAddress) {
    try {
      sendAccountEmail_(verifyEmailAddress, parentName || name, 'verify', accountToken);
    } catch (err) {
      Logger.log('sendAccountEmail_ (verify) failed: ' + (err && err.message ? err.message : err));
    }
  }

  // Joining the club is NOT consent to the newsletter — only the opt-in box is.
  // The member row is written either way so the club still has the contact.
  // subscribeEmail_ swallows its own failures on purpose: a Sender.net problem
  // must not fail the join.
  var subscribed = false;
  if (newsletterOptIn) {
    if (email) {
      subscribed = subscribeEmail_(ss, email, parentName || name, 'Club join — guardian', AUDIENCE_PARENT).ok || subscribed;
    }
    if (studentEmail) {
      subscribed = subscribeEmail_(ss, studentEmail, name, 'Club join — student', AUDIENCE_STUDENT).ok || subscribed;
    }
  }

  return {
    ok: true,
    sessionToken: sessionToken,
    newsletterSubscribed: subscribed,
    needsVerification: needsVerification,
    profile: {
      name: name,
      school: school,
      role: role,
      joinedDate: formatDate_(joinedAt) || 'Club Member',
      level: 1,
      xp: 15,
      unlockedBadges: ['Foundation Member'],
      reservedMissionIds: [],
      newsletterSubscribed: subscribed
    }
  };
}

function handleLogin_(body) {
  var identifier = String(body.identifier || body.email || body.name || '').trim().toLowerCase();
  if (!identifier) return { ok: false, error: 'Please enter your name or email address.' };

  if (isLoginLocked_(identifier)) {
    return { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  var foundIndex = -1;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rName = String(row[MEM_IDX_NAME] || '').trim().toLowerCase();
    var rParentEmail = String(row[MEM_IDX_PARENT_EMAIL] || '').trim().toLowerCase();
    var rStudentEmail = String(row[MEM_IDX_STUDENT_EMAIL] || '').trim().toLowerCase();

    if (rName === identifier || rParentEmail === identifier || rStudentEmail === identifier) {
      foundIndex = i;
      break;
    }
  }

  // One generic message for "no such member" and "wrong password" alike, so a
  // failed attempt never confirms whether an account exists.
  if (foundIndex === -1) {
    recordFailedLogin_(identifier);
    return { ok: false, error: 'Incorrect name/email or password.' };
  }

  var foundUser = rows[foundIndex];
  var sheetRow = foundIndex + 2;
  var storedHash = String(foundUser[MEM_IDX_PASSWORD_HASH] || '').trim();

  if (!storedHash) {
    // A member created before passwords existed — claim the account with a
    // fresh password instead of leaving it permanently locked out.
    var newPassword = String(body.newPassword || '').trim();
    if (!newPassword) {
      return { ok: false, needsPasswordSetup: true, error: 'This account needs a password. Please set one to continue.' };
    }
    if (newPassword.length < 8) {
      return { ok: false, needsPasswordSetup: true, error: 'Password must be at least 8 characters.' };
    }

    storedHash = makePasswordHash_(newPassword);
    members.getRange(sheetRow, MEM_COL_PASSWORD_HASH).setValue(storedHash);
    members.getRange(sheetRow, MEM_COL_EMAIL_VERIFIED).setValue(false);

    var claimEmail = pickAccountEmail_(foundUser[MEM_IDX_PARENT_EMAIL], foundUser[MEM_IDX_STUDENT_EMAIL]);
    if (claimEmail) {
      var claimToken = issueAccountToken_(members, sheetRow, 'verify');
      try {
        sendAccountEmail_(claimEmail, String(foundUser[MEM_IDX_NAME] || '').trim(), 'verify', claimToken);
      } catch (err) {
        Logger.log('sendAccountEmail_ (verify) failed: ' + (err && err.message ? err.message : err));
      }
    }
  } else {
    var password = String(body.password || '');
    if (!password || !verifyPassword_(password, storedHash)) {
      recordFailedLogin_(identifier);
      return { ok: false, error: 'Incorrect name/email or password.' };
    }

    // Self-healing for accounts created while PASSWORD_HASH_ITERATIONS was
    // higher (e.g. the original 10,000, ~19s/login on this platform) — a
    // successful verify already proves the password, so re-hash it at the
    // current (fast) count right here rather than leaving it slow forever.
    var storedIterations = parseInt(String(storedHash).split(':')[1], 10) || 0;
    if (storedIterations !== PASSWORD_HASH_ITERATIONS) {
      members.getRange(sheetRow, MEM_COL_PASSWORD_HASH).setValue(makePasswordHash_(password));
    }
  }

  clearLoginAttempts_(identifier);

  var sessionToken = generateToken_();
  members.getRange(sheetRow, MEM_COL_SESSION_TOKEN).setValue(sessionToken);
  members.getRange(sheetRow, MEM_COL_SESSION_TOKEN_EXPIRES).setValue(new Date(Date.now() + SESSION_DURATION_MS));

  var name = String(foundUser[MEM_IDX_NAME] || '').trim();
  var school = String(foundUser[MEM_IDX_SCHOOL] || '').trim();
  var role = String(foundUser[MEM_IDX_ROLE] || 'Rookie Researcher').trim();
  var level = toWholeNumber_(foundUser[MEM_IDX_LEVEL], 1);
  var xp = toWholeNumber_(foundUser[MEM_IDX_XP], 15);
  var rawBadges = String(foundUser[MEM_IDX_BADGES] || '').trim();
  var rawMissions = String(foundUser[MEM_IDX_MISSIONS] || '').trim();

  var unlockedBadges = rawBadges ? rawBadges.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : ['Foundation Member'];
  var reservedMissionIds = rawMissions ? rawMissions.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

  // Cross-reference Signups sheet for signups under this student's name
  var signupsSheet = ss.getSheetByName(SIGNUPS_SHEET);
  var eventsSheet = ss.getSheetByName(EVENTS_SHEET);

  if (signupsSheet && name) {
    var signupRows = bodyRows_(signupsSheet, SIGNUP_HEADERS.length);
    var nameLower = name.toLowerCase();

    var titleToId = {};
    if (eventsSheet) {
      var eventRows = bodyRows_(eventsSheet, EVENT_HEADERS.length);
      for (var e = 0; e < eventRows.length; e++) {
        var eTitle = String(eventRows[e][0] || '').trim();
        if (eTitle) {
          titleToId[eTitle] = 'sheet-event-' + (e + 2);
        }
      }
    }

    for (var s = 0; s < signupRows.length; s++) {
      var sEventTitle = String(signupRows[s][1] || '').trim();
      var sStudentName = String(signupRows[s][2] || '').trim().toLowerCase();

      if (sStudentName === nameLower && sEventTitle) {
        var eventId = titleToId[sEventTitle] || sEventTitle;
        if (reservedMissionIds.indexOf(eventId) === -1) {
          reservedMissionIds.push(eventId);
        }
      }
    }
  }

  return {
    ok: true,
    sessionToken: sessionToken,
    profile: {
      name: name,
      school: school,
      role: role,
      joinedDate: formatDate_(foundUser[MEM_IDX_TIMESTAMP]) || 'Club Member',
      level: level || 1,
      xp: xp || 15,
      unlockedBadges: unlockedBadges,
      reservedMissionIds: reservedMissionIds,
      newsletterSubscribed: String(foundUser[MEM_IDX_NEWSLETTER_OPTIN]).toLowerCase() === 'true'
    }
  };
}

/**
 * The member row is now found by session token, not by name/email — that's
 * what actually stops one member's sync from being spoofable or colliding
 * with a different member who happens to share a name. A request with no
 * valid, unexpired session is rejected outright rather than falling back to
 * appending a brand-new row, which used to silently create duplicate members.
 */
function handleSyncProfile_(body) {
  var sessionToken = String(body.sessionToken || '').trim();
  if (!sessionToken) return { ok: false, error: 'Missing session token. Please log in again.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  var targetIndex = -1;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][MEM_IDX_SESSION_TOKEN] || '') === sessionToken) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex === -1) return { ok: false, error: 'Session expired. Please log in again.' };
  if (tokenExpired_(rows[targetIndex][MEM_IDX_SESSION_TOKEN_EXPIRES])) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }

  var sheetRow = targetIndex + 2;
  // 0 (not 1) is the "caller didn't send a real level" fallback here, unlike
  // the old code's `toWholeNumber_(body.level, 1)` — that default was truthy,
  // so the `if (level)` guard meant to skip writing it never actually did,
  // and a malformed sync could quietly reset a member back to level 1.
  var level = toWholeNumber_(body.level, 0);
  var xp = toWholeNumber_(body.xp, 0);
  var unlockedBadges = Array.isArray(body.unlockedBadges) ? body.unlockedBadges.join(',') : String(body.unlockedBadges || '');
  var reservedMissions = Array.isArray(body.reservedMissionIds) ? body.reservedMissionIds.join(',') : String(body.reservedMissions || '');

  if (level > 0) members.getRange(sheetRow, MEM_COL_LEVEL).setValue(level);
  members.getRange(sheetRow, MEM_COL_XP).setValue(xp);
  members.getRange(sheetRow, MEM_COL_BADGES).setValue(unlockedBadges);
  members.getRange(sheetRow, MEM_COL_MISSIONS).setValue(reservedMissions);

  return { ok: true };
}

function handleVerifyEmail_(body) {
  var token = String(body.token || '').trim();
  if (!token) return { ok: false, error: 'Missing verification token.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (String(row[MEM_IDX_ACCOUNT_TOKEN] || '') !== token || String(row[MEM_IDX_ACCOUNT_TOKEN_TYPE] || '') !== 'verify') {
      continue;
    }

    var sheetRow = i + 2;
    if (tokenExpired_(row[MEM_IDX_ACCOUNT_TOKEN_EXPIRES])) {
      return { ok: false, error: 'This verification link has expired. Please request a new one.' };
    }

    members.getRange(sheetRow, MEM_COL_EMAIL_VERIFIED).setValue(true);
    clearAccountToken_(members, sheetRow);
    return { ok: true };
  }

  return { ok: false, error: 'This verification link is invalid or has already been used.' };
}

/**
 * Always answers `{ ok: true }` — whether or not the identifier matched a
 * verified account with a usable email — so the response itself never
 * confirms which addresses are registered.
 */
function handleRequestPasswordReset_(body) {
  var identifier = String(body.identifier || '').trim().toLowerCase();
  if (!identifier) return { ok: true };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: true };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rName = String(row[MEM_IDX_NAME] || '').trim().toLowerCase();
    var rParentEmail = String(row[MEM_IDX_PARENT_EMAIL] || '').trim().toLowerCase();
    var rStudentEmail = String(row[MEM_IDX_STUDENT_EMAIL] || '').trim().toLowerCase();

    if (rName !== identifier && rParentEmail !== identifier && rStudentEmail !== identifier) continue;

    var verified = String(row[MEM_IDX_EMAIL_VERIFIED]).toLowerCase() === 'true';
    var hasPassword = !!String(row[MEM_IDX_PASSWORD_HASH] || '').trim();
    var email = pickAccountEmail_(row[MEM_IDX_PARENT_EMAIL], row[MEM_IDX_STUDENT_EMAIL]);

    if (verified && hasPassword && email) {
      var sheetRow = i + 2;
      var token = issueAccountToken_(members, sheetRow, 'reset');
      try {
        sendAccountEmail_(email, String(row[MEM_IDX_NAME] || '').trim(), 'reset', token);
      } catch (err) {
        Logger.log('sendAccountEmail_ (reset) failed: ' + (err && err.message ? err.message : err));
      }
    }
    break;
  }

  return { ok: true };
}

function handleResetPassword_(body) {
  var token = String(body.token || '').trim();
  var newPassword = String(body.newPassword || '');
  if (!token) return { ok: false, error: 'Missing reset token.' };
  if (newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (String(row[MEM_IDX_ACCOUNT_TOKEN] || '') !== token || String(row[MEM_IDX_ACCOUNT_TOKEN_TYPE] || '') !== 'reset') {
      continue;
    }

    var sheetRow = i + 2;
    if (tokenExpired_(row[MEM_IDX_ACCOUNT_TOKEN_EXPIRES])) {
      return { ok: false, error: 'This reset link has expired. Please request a new one.' };
    }

    members.getRange(sheetRow, MEM_COL_PASSWORD_HASH).setValue(makePasswordHash_(newPassword));
    clearAccountToken_(members, sheetRow);
    // A reset should actually lock out anyone using the old password.
    members.getRange(sheetRow, MEM_COL_SESSION_TOKEN).setValue('');
    members.getRange(sheetRow, MEM_COL_SESSION_TOKEN_EXPIRES).setValue('');
    return { ok: true };
  }

  return { ok: false, error: 'This reset link is invalid or has already been used.' };
}

function handleLogout_(body) {
  var sessionToken = String(body.sessionToken || '').trim();
  if (!sessionToken) return { ok: true };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: true };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][MEM_IDX_SESSION_TOKEN] || '') === sessionToken) {
      var sheetRow = i + 2;
      members.getRange(sheetRow, MEM_COL_SESSION_TOKEN).setValue('');
      members.getRange(sheetRow, MEM_COL_SESSION_TOKEN_EXPIRES).setValue('');
      break;
    }
  }

  return { ok: true };
}

/**
 * Records one signup: a row in Signups, +1 on that event's Spots Taken, and a
 * matching bump inside the published snapshot so the site's counter stays
 * current without republishing anything still being drafted.
 */
function handleSignup_(body) {
  var studentName = String(body.studentName || '').trim();
  var school = String(body.school || '').trim();
  var eventId = String(body.eventId || '').trim();

  if (!studentName) return { ok: false, error: 'Please enter the student’s name.' };
  if (!school) return { ok: false, error: 'Please enter the school.' };
  if (!eventId) return { ok: false, error: 'Missing which event this is for.' };

  // Two families submitting at once must not both read the same "Spots Taken".
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return { ok: false, error: 'The server is busy. Please try again in a moment.' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var eventsSheet = ss.getSheetByName(EVENTS_SHEET);
    if (!eventsSheet) return { ok: false, error: 'The Events tab is missing.' };

    var rowNumber = resolveEventRow_(eventsSheet, eventId, body.eventTitle);
    if (!rowNumber) return { ok: false, error: 'That event is no longer listed.' };

    var title = String(eventsSheet.getRange(rowNumber, EVENT_COL_TITLE).getValue()).trim();
    var total = toWholeNumber_(eventsSheet.getRange(rowNumber, EVENT_COL_SPOTS_TOTAL).getValue(), 0);
    var taken = toWholeNumber_(eventsSheet.getRange(rowNumber, EVENT_COL_SPOTS_TAKEN).getValue(), 0);

    if (total > 0 && taken >= total) {
      return { ok: false, error: 'Sorry — this event is now full.' };
    }

    var signups = ss.getSheetByName(SIGNUPS_SHEET);
    if (!signups) {
      signups = ensureSheet_(ss, SIGNUPS_SHEET, SIGNUP_HEADERS, SIGNUP_HEADER_COLOR);
      styleSignupsSheet_(signups);
    }
    signups.appendRow([new Date(), title, studentName, school]);

    var updatedTaken = taken + 1;
    eventsSheet.getRange(rowNumber, EVENT_COL_SPOTS_TAKEN).setValue(updatedTaken);
    bumpPublishedSpots_(ss, eventId, updatedTaken);

    return {
      ok: true,
      eventTitle: title,
      spotsTotal: total,
      spotsReserved: updatedTaken,
      spotsLeft: Math.max(0, total - updatedTaken)
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Finds the Events row for an id like "sheet-event-7". The id carries the row
 * number, but rows move when you insert or delete above them, so the title is
 * verified too and a search is used as a fallback.
 */
function resolveEventRow_(sheet, eventId, expectedTitle) {
  var match = /^sheet-event-(\d+)$/.exec(eventId);
  var lastRow = sheet.getLastRow();
  var wanted = String(expectedTitle || '').trim();

  if (match) {
    var rowNumber = Number(match[1]);
    if (rowNumber >= 2 && rowNumber <= lastRow) {
      var title = String(sheet.getRange(rowNumber, EVENT_COL_TITLE).getValue()).trim();
      if (title && (!wanted || title === wanted)) return rowNumber;
    }
  }

  if (!wanted || lastRow < 2) return null;

  var titles = sheet.getRange(2, EVENT_COL_TITLE, lastRow - 1, 1).getValues();
  for (var i = 0; i < titles.length; i++) {
    if (String(titles[i][0]).trim() === wanted) return i + 2;
  }
  return null;
}

/** Updates one event's spotsReserved inside the published snapshot. */
function bumpPublishedSpots_(ss, eventId, spotsReserved) {
  var sheet = ss.getSheetByName(PUBLISHED_SHEET);
  if (!sheet) return;

  var raw = String(sheet.getRange('A1').getValue() || '');
  if (!raw) return;

  var payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return; // A corrupt snapshot is fixed by publishing again, not by guessing.
  }

  var events = payload.events || [];
  for (var i = 0; i < events.length; i++) {
    if (events[i].id === eventId) {
      events[i].spotsReserved = spotsReserved;
      sheet.getRange('A1').setValue(JSON.stringify(payload));
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Newsletter — Sender.net
// ---------------------------------------------------------------------------

/**
 * A visitor typed their address into the footer box.
 *
 * The address is written to the Newsletter tab first and pushed to Sender.net
 * second, so a Sender outage or an expired token loses nobody: the row sits
 * there with a non-"Subscribed" status until 🔁 Sync Pending Subscribers runs.
 */
function handleSubscribe_(body) {
  var email = normaliseEmail_(body.email);
  var name = String(body.name || '').trim();
  var source = String(body.source || '').trim() || 'Website footer';

  if (!email) return { ok: false, error: 'Please enter your email address.' };
  if (!isEmail_(email)) return { ok: false, error: 'That does not look like an email address.' };

  // Two people subscribing at once must not each append their own copy of the
  // same address, and must not both claim row N.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return { ok: false, error: 'The server is busy. Please try again in a moment.' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var outcome = subscribeEmail_(ss, email, name, source, AUDIENCE_NEWSLETTER);

    // The address is safely recorded either way, so an API-side problem is not
    // the visitor's to fix or to read about — it surfaces in the sheet instead.
    return {
      ok: true,
      alreadySubscribed: !!outcome.alreadySubscribed,
      pending: !outcome.ok
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Records one address in the Newsletter tab and adds it to its Sender.net group.
 *
 * `audience` is one of AUDIENCE_PARENT / AUDIENCE_STUDENT / AUDIENCE_NEWSLETTER
 * and decides which group the address lands in.
 *
 * Returns { ok, status, alreadySubscribed, message } and never throws — a
 * newsletter problem must not fail the join it is attached to.
 */
function subscribeEmail_(ss, email, name, source, audience) {
  email = normaliseEmail_(email);
  if (!isEmail_(email)) {
    return { ok: false, status: 'Skipped — not an email address', message: 'Invalid address.' };
  }

  var titles = groupsForAudience_(audience);
  var outcome;
  try {
    outcome = senderSubscribe_(email, name, audience);
  } catch (err) {
    outcome = { ok: false, status: 'Error: ' + (err && err.message ? err.message : 'unknown'), groups: [] };
  }

  var groupsStr = (outcome.groups && outcome.groups.length ? outcome.groups : titles).join(', ');
  var sheet = newsletterSheet_(ss);
  var now = new Date();
  sheet.appendRow([now, email, name, source, groupsStr, outcome.status, now]);

  return outcome;
}

/**
 * Creates the subscriber in Sender.net and puts them in every group their
 * audience belongs to.
 *
 * Creating an address that Sender already knows is an error there, not a
 * success, so that case falls back to adding the existing subscriber to each
 * group one at a time — which is what actually matters for "will they get the
 * next newsletter". That fallback is also the normal path for a parent who
 * already subscribed through the footer and now needs "Parents" as well.
 *
 * Returns { ok, status, groups } where `groups` lists the titles that actually
 * took, so a partial failure still records what succeeded.
 */
function senderSubscribe_(email, name, audience) {
  var token = senderToken_();
  if (!token) {
    return { ok: false, status: STATUS_PENDING, groups: [], message: 'No Sender.net API token set.' };
  }

  var titles = groupsForAudience_(audience);
  var ids = [];

  for (var i = 0; i < titles.length; i++) {
    var group = senderGroupByTitle_(titles[i], token);
    if (!group.id) {
      return {
        ok: false,
        status: 'Error: could not resolve the "' + titles[i] + '" group — ' + group.error,
        groups: []
      };
    }
    ids.push(group.id);
  }

  var payload = { email: email, groups: ids, trigger_automation: true };
  if (name) payload.firstname = name;

  var created = senderFetch_('post', '/subscribers', payload, token);
  if (created.ok) {
    return { ok: true, status: STATUS_SUBSCRIBED + ' → ' + titles.join(', '), groups: titles.slice() };
  }

  if (!looksLikeDuplicate_(created)) {
    return { ok: false, status: 'Error: ' + senderError_(created), groups: [] };
  }

  var added = [];
  var failures = [];

  for (var j = 0; j < ids.length; j++) {
    var result = senderFetch_(
      'post',
      '/subscribers/groups/' + encodeURIComponent(ids[j]),
      { subscribers: [email], trigger_automation: false },
      token
    );

    if (result.ok && !wasRejectedByGroupAdd_(result, email)) added.push(titles[j]);
    else failures.push(titles[j] + ' (' + senderError_(result) + ')');
  }

  if (!failures.length) {
    return { ok: true, status: STATUS_SUBSCRIBED + ' → ' + added.join(', '), groups: added };
  }
  return { ok: false, status: 'Error: ' + failures.join('; '), groups: added };
}

// --- Account emails (verify / reset) ---------------------------------------
//
// Reuses the exact Sender.net plumbing above (senderFetch_/senderGroupByTitle_/
// senderToken_) instead of a second email pipeline. A group-triggered
// automation does the actual sending — same mechanism as the newsletter
// confirmation email — so this only ever pushes the subscriber + a merge
// field into Sender.net; a human sets up the matching automation once in the
// Sender.net UI (see SETUP.md).

var ACCOUNT_SENDER_GROUPS = {
  verify: 'Account Verification',
  reset: 'Password Reset'
};

function accountActionUrl_(kind, token) {
  var param = kind === 'reset' ? 'reset' : 'verify';
  return 'https://trscienceclub.org/?' + param + '=' + encodeURIComponent(token);
}

/**
 * Pushes `account_link` (a Sender.net custom field, set up by hand) onto the
 * subscriber and adds them to the group whose automation emails that link.
 * Never throws — a Sender.net outage must not fail the join/login/reset flow
 * that triggered it; callers already wrap this in try/catch and log instead.
 */
function sendAccountEmail_(email, name, kind, token) {
  email = normaliseEmail_(email);
  if (!isEmail_(email)) return { ok: false, status: 'Skipped — not an email address' };

  var token_ = senderToken_();
  if (!token_) return { ok: false, status: STATUS_PENDING, message: 'No Sender.net API token set.' };

  var groupTitle = ACCOUNT_SENDER_GROUPS[kind];
  var group = senderGroupByTitle_(groupTitle, token_);
  if (!group.id) {
    return { ok: false, status: 'Error: could not resolve the "' + groupTitle + '" group — ' + group.error };
  }

  var url = accountActionUrl_(kind, token);
  var payload = {
    email: email,
    groups: [group.id],
    trigger_automation: true,
    fields: { account_link: url }
  };
  if (name) payload.firstname = name;

  var created = senderFetch_('post', '/subscribers', payload, token_);
  if (created.ok) return { ok: true, status: 'Sent' };

  if (!looksLikeDuplicate_(created)) {
    return { ok: false, status: 'Error: ' + senderError_(created) };
  }

  // Already a Sender.net subscriber (e.g. from the newsletter) — update the
  // link field, then add them to the group to (re)trigger the automation.
  senderFetch_('patch', '/subscribers/' + encodeURIComponent(email), { fields: { account_link: url } }, token_);

  var added = senderFetch_(
    'post',
    '/subscribers/groups/' + encodeURIComponent(group.id),
    { subscribers: [email], trigger_automation: true },
    token_
  );

  if (added.ok && !wasRejectedByGroupAdd_(added, email)) return { ok: true, status: 'Sent (existing subscriber)' };
  return { ok: false, status: 'Error: ' + senderError_(added) };
}

/** Every group title an audience belongs to. */
function groupsForAudience_(audience) {
  return SENDER_AUDIENCE_GROUPS[audience] || SENDER_AUDIENCE_GROUPS[AUDIENCE_NEWSLETTER];
}

/**
 * Resolves a group title to its Sender.net id, creating the group the first
 * time. Returns { id, title, error }.
 *
 * Ids are cached in Script Properties. If a group is deleted in Sender the
 * cached id goes stale and subscribing starts failing — 👥 Show / Repair
 * Sender Groups clears the cache and re-resolves.
 */
function senderGroupByTitle_(title, token) {
  var props = PropertiesService.getScriptProperties();
  var key = groupPropertyKey_(title);

  var cached = String(props.getProperty(key) || '').trim();
  if (cached) return { id: cached, title: title, error: '' };

  var found = findSenderGroupByTitle_(title, token);
  if (found.error) return { id: '', title: title, error: found.error };

  var id = found.id;
  if (!id) {
    var created = senderFetch_('post', '/groups', { title: title }, token);
    if (!created.ok) return { id: '', title: title, error: senderError_(created) };
    id = created.json && created.json.data ? String(created.json.data.id || '') : '';
    if (!id) return { id: '', title: title, error: 'Sender did not return a group id.' };
  }

  props.setProperty(key, id);
  return { id: id, title: title, error: '' };
}

/** Script Property name caching one group's id, e.g. SENDER_GROUP_ID_PARENTS. */
function groupPropertyKey_(title) {
  return SENDER_GROUP_PROPERTY_PREFIX + String(title).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** Looks up a group by its exact title, walking the paginated group list. */
function findSenderGroupByTitle_(title, token) {
  var wanted = String(title || '').trim().toLowerCase();
  var path = '/groups?limit=100';

  // A club will never have many groups; the cap just stops a runaway loop.
  for (var page = 0; page < 20 && path; page++) {
    var response = senderFetch_('get', path, null, token);
    if (!response.ok) return { id: '', error: senderError_(response) };

    var list = (response.json && response.json.data) || [];
    for (var i = 0; i < list.length; i++) {
      var name = String(list[i].title || list[i].name || '').trim().toLowerCase();
      if (name === wanted) return { id: String(list[i].id || ''), error: '' };
    }

    var next = response.json && response.json.links ? response.json.links.next : null;
    path = next ? String(next).replace(SENDER_API_BASE, '') : '';
  }

  return { id: '', error: '' };
}

/** One HTTP call to Sender.net. Never throws on an HTTP error status. */
function senderFetch_(method, path, payload, token) {
  var options = {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    muteHttpExceptions: true
  };
  if (payload) options.payload = JSON.stringify(payload);

  var response = UrlFetchApp.fetch(SENDER_API_BASE + path, options);
  var code = response.getResponseCode();
  var text = String(response.getContentText() || '');
  var json = null;
  try {
    json = JSON.parse(text);
  } catch (err) {
    json = null;
  }

  return { ok: code >= 200 && code < 300, code: code, text: text, json: json };
}

/** Sender reports an existing address as a validation failure, not a conflict. */
function looksLikeDuplicate_(response) {
  if (response.code === 409) return true;
  if (response.code !== 422 && response.code !== 400) return false;
  return /already|taken|exist|duplicate/i.test(response.text);
}

/**
 * The group-add endpoint answers 200 even for addresses it could not place,
 * listing them under non_existing_subscribers.
 */
function wasRejectedByGroupAdd_(response, email) {
  var message = response.json && response.json.message;
  var missing = message && message.non_existing_subscribers;
  if (!missing || !missing.length) return false;

  for (var i = 0; i < missing.length; i++) {
    if (normaliseEmail_(missing[i]) === email) return true;
  }
  return false;
}

/** A short, human-readable version of a failed Sender response. */
function senderError_(response) {
  var detail = '';
  if (response.json) {
    if (typeof response.json.message === 'string') detail = response.json.message;
    else if (response.json.error) detail = String(response.json.error);
    else if (response.json.errors) detail = JSON.stringify(response.json.errors);
  }
  if (!detail) detail = response.text;

  detail = String(detail).replace(/\s+/g, ' ').trim();
  if (detail.length > 160) detail = detail.substring(0, 160) + '…';
  return 'HTTP ' + response.code + (detail ? ' — ' + detail : '');
}

// --- Newsletter sheet ------------------------------------------------------

function newsletterSheet_(ss) {
  var sheet = ss.getSheetByName(NEWSLETTER_SHEET);
  if (!sheet) {
    sheet = ensureSheet_(ss, NEWSLETTER_SHEET, NEWSLETTER_HEADERS, NEWSLETTER_HEADER_COLOR);
    styleNewsletterSheet_(sheet);
  }
  return sheet;
}

function setNewsletterResult_(ss, row, status, groups) {
  var sheet = newsletterSheet_(ss);
  sheet.getRange(row, NL_COL_GROUPS).setValue(groups.join(', '));
  sheet.getRange(row, NL_COL_STATUS).setValue(status);
  sheet.getRange(row, NL_COL_ATTEMPT).setValue(new Date());
}

function splitGroups_(value) {
  return String(value || '')
    .split(',')
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);
}

function hasGroup_(groups, title) {
  var wanted = String(title || '').toLowerCase();
  for (var i = 0; i < groups.length; i++) {
    if (String(groups[i]).toLowerCase() === wanted) return true;
  }
  return false;
}

/** Union of two group-title lists, keeping the order already on the sheet. */
function mergeGroups_(groups, added) {
  var merged = (groups || []).slice();
  for (var i = 0; i < (added || []).length; i++) {
    if (!hasGroup_(merged, added[i])) merged.push(added[i]);
  }
  return merged;
}

/**
 * Which audience a stalled row should be retried as.
 *
 * Source is the reliable signal — it records how the address arrived. The
 * groups already recorded are only a fallback, and "Parents"/"Students" beat
 * "Newsletter" there because club members are in Newsletter too, so seeing
 * Newsletter alone proves nothing.
 */
function audienceForRow_(groupsCell, sourceCell) {
  var source = String(sourceCell || '').toLowerCase();
  if (source.indexOf('student') !== -1) return AUDIENCE_STUDENT;
  if (source.indexOf('guardian') !== -1 || source.indexOf('parent') !== -1) return AUDIENCE_PARENT;

  var groups = splitGroups_(groupsCell);
  if (hasGroup_(groups, GROUP_STUDENTS)) return AUDIENCE_STUDENT;
  if (hasGroup_(groups, GROUP_PARENTS)) return AUDIENCE_PARENT;
  return AUDIENCE_NEWSLETTER;
}

function normaliseEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

// --- Menu items ------------------------------------------------------------

/** 🔑 Stores the Sender.net API token in Script Properties. */
function setSenderApiToken() {
  var ui = SpreadsheetApp.getUi();
  var current = senderToken_();

  var response = ui.prompt(
    'Sender.net API token',
    (current ? 'A token is already saved (' + maskToken_(current) + ').\n\n' : '') +
      'Get one at sender.net ▸ Settings ▸ API access tokens, then paste it below.\n' +
      'Leave the box empty and click OK to remove the saved token.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  var token = String(response.getResponseText() || '').trim();
  var props = PropertiesService.getScriptProperties();

  if (!token) {
    props.deleteProperty(SENDER_TOKEN_PROPERTY);
    ui.alert('Token removed', 'New subscribers will be collected in the Newsletter tab but not sent to Sender.net.', ui.ButtonSet.OK);
    return;
  }

  props.setProperty(SENDER_TOKEN_PROPERTY, token);

  var check = senderFetch_('get', '/groups', null, token);
  if (check.ok) {
    ui.alert(
      'Token saved',
      'Sender.net accepted the token.\n\nThe Parents, Students and Newsletter groups are created ' +
        'automatically on the first sign-up. To create them now (and see their ids), use ' +
        '👥 Show / Repair Sender Groups.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      'Token saved, but Sender rejected it',
      'Sender.net answered: ' + senderError_(check) + '\n\nDouble-check the token and try again.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * 👥 Makes sure Parents / Students / Newsletter exist in Sender.net and shows
 * their ids. Forgets the cached ids first, so this also repairs the setup after
 * a group is renamed or deleted in Sender.
 */
function showSenderGroups() {
  var token = senderToken_();
  if (!token) {
    notify_('No API token yet', 'Set the API token first: ✉️ Newsletter ▸ 🔑 Set Sender.net API Token.');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var lines = [];

  for (var i = 0; i < SENDER_GROUP_TITLES.length; i++) {
    var title = SENDER_GROUP_TITLES[i];
    props.deleteProperty(groupPropertyKey_(title));
    var group = senderGroupByTitle_(title, token);
    lines.push('  ' + title + '  →  ' + (group.id || 'FAILED: ' + group.error));
  }

  notify_(
    'Sender.net groups',
    'Addresses are routed like this:\n\n' +
      '  Join form, guardian email   →  Parents + Newsletter\n' +
      '  Join form, student email    →  Students + Newsletter\n' +
      '  Footer subscribe box        →  Newsletter only\n\n' +
      'Groups (created if they were missing):\n' + lines.join('\n')
  );
}

/**
 * 🧪 Checks reading *and* writing, separately.
 *
 * These are worth reporting apart because they fail apart: an account that is
 * still under review, or otherwise restricted, can answer reads perfectly while
 * refusing to create subscribers. A read-only check in that situation says
 * "connected" and sends you off to re-generate a token that was never the
 * problem — which is exactly what it did before this told you both halves.
 */
function testSenderConnection() {
  var token = senderToken_();
  if (!token) {
    notify_('Not connected', 'No API token saved.\n\nSet one with ✉️ Newsletter ▸ 🔑 Set Sender.net API Token.');
    return;
  }

  var groups = senderFetch_('get', '/groups?limit=100', null, token);
  if (!groups.ok) {
    notify_(
      'Reading failed',
      'Sender.net answered: ' + senderError_(groups) +
        '\n\nThe token is not being accepted at all. Generate a fresh one in ' +
        'Sender.net ▸ Settings ▸ API access tokens.'
    );
    return;
  }

  var lines = [];
  for (var i = 0; i < SENDER_GROUP_TITLES.length; i++) {
    var group = senderGroupByTitle_(SENDER_GROUP_TITLES[i], token);
    lines.push('  ' + SENDER_GROUP_TITLES[i] + '  →  ' + (group.id || 'FAILED: ' + group.error));
  }

  var write = senderWriteProbe_(token);

  notify_(
    write.ok ? 'Connected to Sender.net' : 'Reading works, but writing is blocked',
    'Token: ' + maskToken_(token) + '\n' +
      'Reading (list groups): OK — ' + ((groups.json && groups.json.data) || []).length + ' groups\n' +
      'Writing (add subscriber): ' + (write.ok ? 'OK' : 'FAILED — ' + write.error) + '\n\n' +
      'Club groups:\n' + lines.join('\n') +
      (write.ok
        ? '\n\nSign-ups will reach Sender.net.' +
          (write.created ? '\n\nThis added the test address ' + SENDER_PROBE_EMAIL + ' — delete it from your subscribers.' : '')
        : '\n\nYour token is fine — reading proves that. Sign-ups cannot be written ' +
          'until this is lifted, which is usually an account still awaiting review ' +
          'or verification. Check your Sender.net dashboard for a notice, or ask ' +
          'their support whether the API can create subscribers yet.\n\n' +
          'Nothing is lost meanwhile: addresses keep collecting in the Newsletter ' +
          'tab. Run 🔁 Sync Pending Subscribers once this clears.')
  );
}

/**
 * Tries the one operation sign-ups depend on: creating a subscriber.
 *
 * Uses an example.com address, which is reserved by the IANA and can never
 * belong to a real person. "Already exists" counts as success — it means the
 * write was allowed, just redundant.
 */
function senderWriteProbe_(token) {
  var response = senderFetch_(
    'post',
    '/subscribers',
    { email: SENDER_PROBE_EMAIL, trigger_automation: false },
    token
  );

  if (response.ok) return { ok: true, created: true, error: '' };
  if (looksLikeDuplicate_(response)) return { ok: true, created: false, error: '' };
  return { ok: false, created: false, error: senderError_(response) };
}

/**
 * 🔁 Retries every Newsletter row that is not yet Subscribed.
 *
 * Use after setting the API token for the first time, or after a Sender outage.
 */
function syncNewsletterToSender() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!senderToken_()) {
    notify_('No API token', 'Set one with ✉️ Newsletter ▸ 🔑 Set Sender.net API Token, then run this again.');
    return;
  }

  var sheet = newsletterSheet_(ss);
  var rows = bodyRows_(sheet, NEWSLETTER_HEADERS.length);

  var done = 0;
  var failed = 0;
  var skipped = 0;

  for (var i = 0; i < rows.length; i++) {
    var status = String(rows[i][NL_COL_STATUS - 1] || '').trim();
    if (status.indexOf(STATUS_SUBSCRIBED) === 0) continue;

    var email = normaliseEmail_(rows[i][NL_COL_EMAIL - 1]);
    if (!isEmail_(email)) {
      skipped++;
      continue;
    }

    var audience = audienceForRow_(rows[i][NL_COL_GROUPS - 1], rows[i][NL_COL_SOURCE - 1]);

    var outcome;
    try {
      outcome = senderSubscribe_(email, String(rows[i][NL_COL_NAME - 1] || '').trim(), audience);
    } catch (err) {
      outcome = { ok: false, status: 'Error: ' + (err && err.message ? err.message : 'unknown'), groups: [] };
    }

    var groups = mergeGroups_(splitGroups_(rows[i][NL_COL_GROUPS - 1]), outcome.groups);

    setNewsletterResult_(ss, i + 2, outcome.status, groups);
    if (outcome.ok) done++;
    else failed++;

    // Sender.net rate-limits; a short pause keeps a big backlog from tripping it.
    Utilities.sleep(400);
  }

  notify_(
    'Newsletter sync finished',
    'Subscribed: ' + done + '\nStill failing: ' + failed + '\nSkipped (not an email): ' + skipped +
      (failed ? '\n\nOpen the Newsletter tab — the "Sender Status" column says why.' : '')
  );
}

function senderToken_() {
  return String(PropertiesService.getScriptProperties().getProperty(SENDER_TOKEN_PROPERTY) || '').trim();
}

function maskToken_(token) {
  if (token.length <= 8) return '••••';
  return token.substring(0, 4) + '…' + token.substring(token.length - 4);
}

function readPublishedJson_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss ? ss.getSheetByName(PUBLISHED_SHEET) : null;
    return sheet ? String(sheet.getRange('A1').getValue() || '') : '';
  } catch (err) {
    return '';
  }
}

/** Returns JSON, or JSONP when a ?callback= is supplied. */
function serve_(json, e) {
  var callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Menu helpers
// ---------------------------------------------------------------------------

function showWebAppUrl() {
  var ui = SpreadsheetApp.getUi();
  var url;
  try {
    url = ScriptApp.getService().getUrl();
  } catch (err) {
    url = null;
  }

  if (!url) {
    ui.alert(
      'Not deployed yet',
      'Deploy the web app first:\n\nDeploy ▸ New deployment ▸ Web app\n' +
        '  Execute as: Me\n  Who has access: Anyone\n\nThen copy the /exec URL.',
      ui.ButtonSet.OK
    );
    return;
  }

  ui.alert('Web app URL', url + '\n\nPaste this into src/config.ts as SHEET_API_URL.', ui.ButtonSet.OK);
}

function previewPublishedJson() {
  var ui = SpreadsheetApp.getUi();
  var json = readPublishedJson_();
  ui.alert(
    'Currently published',
    json ? json.substring(0, 1500) + (json.length > 1500 ? '\n\n…truncated' : '') : 'Nothing published yet.',
    ui.ButtonSet.OK
  );
}
