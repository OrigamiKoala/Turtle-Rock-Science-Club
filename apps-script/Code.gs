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
var MEMBERS_SHEET = 'Members';
var SIGNUPS_SHEET = 'Signups';
var NEWSLETTER_SHEET = 'Newsletter';
var PUBLISHED_SHEET = '_Published';

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
  'Age',
  'Level',
  'XP',
  'Unlocked Badges',
  'Reserved Missions',
  'Student Email'
];

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

var BRAND_DARK = '#064e3b';
var SIGNUP_HEADER_COLOR = '#1e3a8a';
var NEWSLETTER_HEADER_COLOR = '#7c2d12';

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
  var members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
  var signups = ensureSheet_(ss, SIGNUPS_SHEET, SIGNUP_HEADERS, SIGNUP_HEADER_COLOR);
  var newsletter = ensureSheet_(ss, NEWSLETTER_SHEET, NEWSLETTER_HEADERS, NEWSLETTER_HEADER_COLOR);

  styleEventsSheet_(events);
  styleAnnouncementsSheet_(announcements);
  styleLabLogSheet_(labLog);
  stylePhotosSheet_(photos);
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
      '  • Events\n  • Announcements\n  • Lab Log\n  • Photos\n  • Members (filled in automatically)\n' +
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
  if (!sheet) sheet = ss.insertSheet(name);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(ANNOUNCEMENT_CATEGORIES));
  sheet.getRange(2, 5, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, ANNOUNCEMENT_HEADERS.length).setVerticalAlignment('top');
}

function styleLabLogSheet_(sheet) {
  setWidths_(sheet, [240, 130, 130, 380, 460, 300, 180, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(LABLOG_CATEGORIES));
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
  setWidths_(sheet, [180, 200, 240, 180, 200, 240, 80, 80, 80, 260, 260]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;
  sheet.getRange(2, 1, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, body + 1, MEMBER_HEADERS.length).setVerticalAlignment('top');
}

function stylePhotosSheet_(sheet) {
  setWidths_(sheet, [220, 320, 400, 140, 180, 100]);
  var body = Math.min(100, Math.max(20, sheet.getLastRow() - 1));
  if (body <= 0) return;

  sheet.getRange(2, 4, body, 1).setDataValidation(categoryRule_(PHOTO_CATEGORIES));
  sheet.getRange(2, 6, body, 1).insertCheckboxes();
  sheet.getRange(2, 3, body, 1).setWrap(true);
  sheet.getRange(1, 1, body + 1, PHOTO_HEADERS.length).setVerticalAlignment('top');
}

function setWidths_(sheet, widths) {
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

function categoryRule_(values) {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .setHelpText('Pick a category — it controls the badge shown on the site.')
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

  ensurePublishedSheet_(ss).getRange('A1').setValue(json);

  ui.alert(
    '🚀 Published!',
    'The website now shows:\n\n' +
      '  • ' + events.length + ' active event(s)\n' +
      '  • ' + photosList.length + ' direct photo(s)\n' +
      '  • ' + eventPhotos.length + ' photo album(s)\n' +
      '  • ' + announcements.length + ' announcement(s)\n' +
      '  • ' + labLogs.length + ' lab log entr(ies)\n\n' +
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
    if (taken > total) {
      problems.push(
        'Events row ' + rowNumber + ' ("' + title + '"): Spots Taken (' + taken +
          ') is more than Spots Total (' + total + ').'
      );
      continue;
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

    if (isDone) continue;

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
      category: normaliseCategory_(row[3], PHOTO_CATEGORIES),
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
      category: normaliseCategory_(row[2], ANNOUNCEMENT_CATEGORIES),
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
      category: normaliseCategory_(row[2], LABLOG_CATEGORIES),
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
  var childAge = String(body.childAge || '').trim();

  if (!name) return { ok: false, error: 'Please enter a name.' };
  if (!school) return { ok: false, error: 'Please enter a school.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) {
    members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
    styleMembersSheet_(members);
  }

  members.appendRow([new Date(), name, school, role, parentName, email, childAge, 1, 15, 'Foundation Member', '', studentEmail]);

  // Joining the club subscribes you to the newsletter. subscribeEmail_ swallows
  // its own failures on purpose — a Sender.net problem must not fail the join.
  var subscribed = false;
  if (email) {
    subscribed = subscribeEmail_(ss, email, parentName || name, 'Club join — guardian', AUDIENCE_PARENT).ok || subscribed;
  }
  if (studentEmail) {
    subscribed = subscribeEmail_(ss, studentEmail, name, 'Club join — student', AUDIENCE_STUDENT).ok || subscribed;
  }

  return { ok: true, name: name, newsletterSubscribed: subscribed };
}

function handleLogin_(body) {
  var identifier = String(body.identifier || body.email || body.name || '').trim().toLowerCase();
  if (!identifier) return { ok: false, error: 'Please enter your name or email address.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  var foundUser = null;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rName = String(row[1] || '').trim().toLowerCase();
    var rEmail = String(row[5] || '').trim().toLowerCase();

    if (rName === identifier || rEmail === identifier) {
      foundUser = row;
      break;
    }
  }

  if (!foundUser) {
    return { ok: false, error: 'Member not found. Check spelling or click Join to sign up.' };
  }

  var name = String(foundUser[1] || '').trim();
  var school = String(foundUser[2] || '').trim();
  var role = String(foundUser[3] || 'Rookie Researcher').trim();
  var level = toWholeNumber_(foundUser[7], 1);
  var xp = toWholeNumber_(foundUser[8], 15);
  var rawBadges = String(foundUser[9] || '').trim();
  var rawMissions = String(foundUser[10] || '').trim();

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
    profile: {
      name: name,
      school: school,
      role: role,
      joinedDate: formatDate_(foundUser[0]) || 'Club Member',
      level: level || 1,
      xp: xp || 15,
      unlockedBadges: unlockedBadges,
      reservedMissionIds: reservedMissionIds,
      newsletterSubscribed: false
    }
  };
}

function handleSyncProfile_(body) {
  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var school = String(body.school || '').trim();
  var role = String(body.role || 'Rookie Researcher').trim();
  var level = toWholeNumber_(body.level, 1);
  var xp = toWholeNumber_(body.xp, 0);
  var unlockedBadges = Array.isArray(body.unlockedBadges) ? body.unlockedBadges.join(',') : String(body.unlockedBadges || '');
  var reservedMissions = Array.isArray(body.reservedMissionIds) ? body.reservedMissionIds.join(',') : String(body.reservedMissions || '');

  if (!name && !email) return { ok: false, error: 'Missing name or email for profile sync.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) {
    members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
    styleMembersSheet_(members);
  }

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  var targetRow = -1;
  var nameLower = name.toLowerCase();
  var emailLower = email.toLowerCase();

  for (var i = 0; i < rows.length; i++) {
    var rName = String(rows[i][1] || '').trim().toLowerCase();
    var rEmail = String(rows[i][5] || '').trim().toLowerCase();
    if ((nameLower && rName === nameLower) || (emailLower && rEmail === emailLower)) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow > 1) {
    if (level) members.getRange(targetRow, 8).setValue(level);
    members.getRange(targetRow, 9).setValue(xp);
    members.getRange(targetRow, 10).setValue(unlockedBadges);
    members.getRange(targetRow, 11).setValue(reservedMissions);
  } else {
    members.appendRow([new Date(), name, school, role, '', email, '', level, xp, unlockedBadges, reservedMissions]);
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
  var existing = findNewsletterRow_(ss, email);

  // Already handled only if every group this audience needs was reached — a
  // parent who used the footer box first is in Newsletter but not Parents.
  if (existing && existing.status.indexOf(STATUS_SUBSCRIBED) === 0 && hasAllGroups_(existing.groups, titles)) {
    return { ok: true, alreadySubscribed: true, status: existing.status };
  }

  // Capture before calling out: if UrlFetch throws or the run times out here,
  // the address is already on the sheet and the sync will retry it.
  var row = upsertNewsletterRow_(ss, email, name, source, existing, 'Queued…', existing ? existing.groups : []);

  var outcome;
  try {
    outcome = senderSubscribe_(email, name, audience);
  } catch (err) {
    outcome = { ok: false, status: 'Error: ' + (err && err.message ? err.message : 'unknown'), groups: [] };
  }

  var groups = mergeGroups_(existing ? existing.groups : [], outcome.groups);

  setNewsletterResult_(ss, row, outcome.status, groups);
  outcome.alreadySubscribed = !!existing;
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

/**
 * Finds an address already on the Newsletter tab.
 * Returns { row, status, groups, name } or null.
 */
function findNewsletterRow_(ss, email) {
  var sheet = newsletterSheet_(ss);
  var rows = bodyRows_(sheet, NEWSLETTER_HEADERS.length);

  for (var i = 0; i < rows.length; i++) {
    if (normaliseEmail_(rows[i][NL_COL_EMAIL - 1]) === email) {
      return {
        row: i + 2,
        status: String(rows[i][NL_COL_STATUS - 1] || '').trim(),
        groups: splitGroups_(rows[i][NL_COL_GROUPS - 1]),
        name: String(rows[i][NL_COL_NAME - 1] || '').trim()
      };
    }
  }
  return null;
}

/** Adds or refreshes one Newsletter row. Returns its row number. */
function upsertNewsletterRow_(ss, email, name, source, existing, status, groups) {
  var sheet = newsletterSheet_(ss);
  var now = new Date();

  if (existing) {
    if (name) sheet.getRange(existing.row, NL_COL_NAME).setValue(name);
    sheet.getRange(existing.row, NL_COL_SOURCE).setValue(source);
    sheet.getRange(existing.row, NL_COL_GROUPS).setValue(groups.join(', '));
    sheet.getRange(existing.row, NL_COL_STATUS).setValue(status);
    sheet.getRange(existing.row, NL_COL_ATTEMPT).setValue(now);
    return existing.row;
  }

  sheet.appendRow([now, email, name, source, groups.join(', '), status, now]);
  return sheet.getLastRow();
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

function hasAllGroups_(groups, titles) {
  for (var i = 0; i < titles.length; i++) {
    if (!hasGroup_(groups, titles[i])) return false;
  }
  return true;
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

/** 🧪 Confirms the token works and shows what is configured. */
function testSenderConnection() {
  var token = senderToken_();
  if (!token) {
    notify_('Not connected', 'No API token saved.\n\nSet one with ✉️ Newsletter ▸ 🔑 Set Sender.net API Token.');
    return;
  }

  var groups = senderFetch_('get', '/groups?limit=100', null, token);
  if (!groups.ok) {
    notify_('Sender.net rejected the request', senderError_(groups));
    return;
  }

  var lines = [];
  for (var i = 0; i < SENDER_GROUP_TITLES.length; i++) {
    var group = senderGroupByTitle_(SENDER_GROUP_TITLES[i], token);
    lines.push('  ' + SENDER_GROUP_TITLES[i] + '  →  ' + (group.id || 'FAILED: ' + group.error));
  }

  notify_(
    'Connected to Sender.net',
    'Token: ' + maskToken_(token) + '\n' +
      'Groups in your account: ' + ((groups.json && groups.json.data) || []).length + '\n\n' +
      'Club groups:\n' + lines.join('\n')
  );
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
