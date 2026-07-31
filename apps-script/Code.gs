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
  'Reserved Missions'
];

var PHOTO_HEADERS = ['Title', 'Image URL', 'Caption', 'Category', 'Submitted By', 'Show on Site'];

var ANNOUNCEMENT_CATEGORIES = ['general', 'expansion', 'toolkit', 'volunteer'];
var LABLOG_CATEGORIES = ['chemistry', 'robotics', 'astronomy', 'general'];
var PHOTO_CATEGORIES = ['experiments', 'field-trips', 'lab-meetings'];

var BRAND_DARK = '#064e3b';
var SIGNUP_HEADER_COLOR = '#1e3a8a';

// Column positions in the Events sheet (1-based), used by the signup handler.
var EVENT_COL_TITLE = 1;
var EVENT_COL_SPOTS_TOTAL = 6;
var EVENT_COL_SPOTS_TAKEN = 7;

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/** Simple trigger: builds the custom menu every time the sheet is opened. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐢 Website')
    .addItem('🚀 Publish to Website', 'publishToWebsite')
    .addSeparator()
    .addItem('🔗 Show Web App URL', 'showWebAppUrl')
    .addItem('👀 Preview Published JSON', 'previewPublishedJson')
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

  styleEventsSheet_(events);
  styleAnnouncementsSheet_(announcements);
  styleLabLogSheet_(labLog);
  stylePhotosSheet_(photos);
  styleMembersSheet_(members);
  styleSignupsSheet_(signups);

  var stray = ss.getSheetByName('Sheet1');
  if (stray && stray.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(stray);
  }

  ensurePublishedSheet_(ss);
  ss.setActiveSheet(events);

  notify_(
    'Setup complete',
    'Your tabs are ready:\n\n' +
      '  • Events\n  • Announcements\n  • Lab Log\n  • Photos\n  • Members (filled in automatically)\n  • Signups (filled in automatically)\n\n' +
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
  var body = sheet.getMaxRows() - 1;
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
  sheet.getRange(1, 1, sheet.getMaxRows(), EVENT_HEADERS.length).setVerticalAlignment('top');
}

function styleAnnouncementsSheet_(sheet) {
  setWidths_(sheet, [260, 130, 130, 560, 100]);
  var body = sheet.getMaxRows() - 1;
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(ANNOUNCEMENT_CATEGORIES));
  sheet.getRange(2, 5, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 1).setWrap(true);
  sheet.getRange(1, 1, sheet.getMaxRows(), ANNOUNCEMENT_HEADERS.length).setVerticalAlignment('top');
}

function styleLabLogSheet_(sheet) {
  setWidths_(sheet, [240, 130, 130, 380, 460, 300, 180, 100]);
  var body = sheet.getMaxRows() - 1;
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule_(LABLOG_CATEGORIES));
  sheet.getRange(2, 8, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 2).setWrap(true);
  sheet.getRange(1, 1, sheet.getMaxRows(), LABLOG_HEADERS.length).setVerticalAlignment('top');
}

function styleSignupsSheet_(sheet) {
  setWidths_(sheet, [180, 260, 220, 260]);
  var body = sheet.getMaxRows() - 1;
  if (body <= 0) return;
  sheet.getRange(2, 1, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, sheet.getMaxRows(), SIGNUP_HEADERS.length).setVerticalAlignment('top');
}

function styleMembersSheet_(sheet) {
  setWidths_(sheet, [180, 200, 240, 180, 200, 240, 80, 80, 80, 260, 260]);
  var body = sheet.getMaxRows() - 1;
  if (body <= 0) return;
  sheet.getRange(2, 1, body, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(1, 1, sheet.getMaxRows(), MEMBER_HEADERS.length).setVerticalAlignment('top');
}

function stylePhotosSheet_(sheet) {
  setWidths_(sheet, [220, 320, 400, 140, 180, 100]);
  var body = sheet.getMaxRows() - 1;
  if (body <= 0) return;

  sheet.getRange(2, 4, body, 1).setDataValidation(categoryRule_(PHOTO_CATEGORIES));
  sheet.getRange(2, 6, body, 1).insertCheckboxes();
  sheet.getRange(2, 3, body, 1).setWrap(true);
  sheet.getRange(1, 1, sheet.getMaxRows(), PHOTO_HEADERS.length).setVerticalAlignment('top');
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
    var photosUrl = String(row[10] || '').trim();

    if (photosUrl) {
      eventPhotos.push({
        id: 'sheet-photo-' + rowNumber,
        title: title,
        date: formatDate_(row[1]),
        description: String(row[4] || '').trim() || ('Photo album for ' + title),
        albumUrl: photosUrl,
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
      photos: photosUrl
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
  var email = String(body.email || '').trim();
  var childAge = String(body.childAge || '').trim();

  if (!name) return { ok: false, error: 'Please enter a name.' };
  if (!school) return { ok: false, error: 'Please enter a school.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) {
    members = ensureSheet_(ss, MEMBERS_SHEET, MEMBER_HEADERS, BRAND_DARK);
    styleMembersSheet_(members);
  }

  members.appendRow([new Date(), name, school, role, parentName, email, childAge, 1, 15, 'Foundation Member', '']);

  return { ok: true, name: name };
}

function handleLogin_(body) {
  var identifier = String(body.identifier || body.email || body.name || '').trim().toLowerCase();
  if (!identifier) return { ok: false, error: 'Please enter your name or email address.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var members = ss.getSheetByName(MEMBERS_SHEET);
  if (!members) return { ok: false, error: 'No member records found in spreadsheet.' };

  var rows = bodyRows_(members, MEMBER_HEADERS.length);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rName = String(row[1] || '').trim().toLowerCase();
    var rEmail = String(row[5] || '').trim().toLowerCase();

    if (rName === identifier || rEmail === identifier) {
      var name = String(row[1] || '').trim();
      var school = String(row[2] || '').trim();
      var role = String(row[3] || 'Rookie Researcher').trim();
      var level = toWholeNumber_(row[7], 1);
      var xp = toWholeNumber_(row[8], 15);
      var rawBadges = String(row[9] || '').trim();
      var rawMissions = String(row[10] || '').trim();

      var unlockedBadges = rawBadges ? rawBadges.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : ['Foundation Member'];
      var reservedMissionIds = rawMissions ? rawMissions.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

      return {
        ok: true,
        profile: {
          name: name,
          school: school,
          role: role,
          joinedDate: formatDate_(row[0]) || 'Club Member',
          level: level || 1,
          xp: xp || 15,
          unlockedBadges: unlockedBadges,
          reservedMissionIds: reservedMissionIds,
          newsletterSubscribed: false
        }
      };
    }
  }

  return { ok: false, error: 'Member not found. Check spelling or click Join to sign up.' };
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
