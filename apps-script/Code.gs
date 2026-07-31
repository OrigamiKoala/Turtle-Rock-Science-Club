/**
 * Turtle Rock Science Club — Website Content Publisher
 * =====================================================
 * Bound to: "Turtle Rock Science Club — Website Content"
 * https://docs.google.com/spreadsheets/d/1F-4w57Cehlh-55I8fmAzeYY0DUFYS2I6FpOfjjqUhV0/edit
 *
 * WHAT THIS DOES
 *   You type events into the "Events" tab and announcements into the
 *   "Announcements" tab. When you click  🐢 Website ▸ Publish to Website,
 *   this script snapshots both tabs into JSON and serves it from a web app
 *   URL. The website fetches that URL and shows your content.
 *
 *   Nothing you type appears on the site until you hit Publish. That means
 *   you can draft a half-finished event without it going live.
 *
 * FIRST-TIME SETUP (see SETUP.md for the click-by-click version)
 *   1. Extensions ▸ Apps Script, paste this file, save.
 *   2. Run  setupSheets  once (authorize when prompted).
 *   3. Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me,
 *      Who has access: Anyone. Copy the /exec URL.
 *   4. Paste that URL into src/config.ts on the website.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var EVENTS_SHEET = 'Events';
var ANNOUNCEMENTS_SHEET = 'Announcements';
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
  'Show on Site'
];

var ANNOUNCEMENT_HEADERS = [
  'Title',
  'Date',
  'Category',
  'Content',
  'Show on Site'
];

var ANNOUNCEMENT_CATEGORIES = ['general', 'expansion', 'toolkit', 'volunteer'];

var BRAND_GREEN = '#10b981';
var BRAND_DARK = '#064e3b';

// ---------------------------------------------------------------------------
// Menu — this is the "Publish" button in the menu bar
// ---------------------------------------------------------------------------

/**
 * Simple trigger: runs automatically every time the spreadsheet is opened.
 * Builds the custom "🐢 Website" menu.
 */
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
// Setup — builds the two tabs with headers, formatting and validation
// ---------------------------------------------------------------------------

/**
 * Creates (or repairs) the Events and Announcements tabs.
 * Safe to re-run: it never deletes rows you have typed.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var events = ensureSheet_(ss, EVENTS_SHEET, EVENT_HEADERS);
  var announcements = ensureSheet_(ss, ANNOUNCEMENTS_SHEET, ANNOUNCEMENT_HEADERS);

  styleEventsSheet_(events);
  styleAnnouncementsSheet_(announcements);

  // Seed one example row each, but only on a genuinely empty sheet, so
  // re-running setup never clobbers real content.
  if (events.getLastRow() < 2) seedExampleEvent_(events);
  if (announcements.getLastRow() < 2) seedExampleAnnouncement_(announcements);

  // The default "Sheet1" is noise once the real tabs exist.
  var stray = ss.getSheetByName('Sheet1');
  if (stray && stray.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(stray);
  }

  ensurePublishedSheet_(ss);
  ss.setActiveSheet(events);

  SpreadsheetApp.getUi().alert(
    'Setup complete',
    'Your "Events" and "Announcements" tabs are ready.\n\n' +
      'Type your content, then click  🐢 Website ▸ Publish to Website.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  sheet
    .getRange(1, 1, 1, headers.length)
    .setBackground(BRAND_DARK)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 34);
  return sheet;
}

function styleEventsSheet_(sheet) {
  var widths = [220, 130, 170, 220, 420, 90, 90, 300, 100];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);

  var maxRows = sheet.getMaxRows();
  var body = maxRows - 1;
  if (body <= 0) return;

  // Date column accepts either a real date or free text like "August 14, 2026".
  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');

  // Spot counts must be whole numbers — a decimal here would be a typo.
  var wholeNumber = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setAllowInvalid(false)
    .setHelpText('Enter a whole number of spots (0 or more).')
    .build();
  sheet.getRange(2, 6, body, 2).setDataValidation(wholeNumber);

  // "Show on Site" is a checkbox so it is obvious at a glance.
  sheet.getRange(2, 9, body, 1).insertCheckboxes();

  sheet.getRange(2, 5, body, 1).setWrap(true);
  sheet.getRange(1, 1, maxRows, EVENT_HEADERS.length).setVerticalAlignment('top');
}

function styleAnnouncementsSheet_(sheet) {
  var widths = [260, 130, 130, 560, 100];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);

  var maxRows = sheet.getMaxRows();
  var body = maxRows - 1;
  if (body <= 0) return;

  sheet.getRange(2, 2, body, 1).setNumberFormat('mmmm d, yyyy');

  var categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ANNOUNCEMENT_CATEGORIES, true)
    .setAllowInvalid(false)
    .setHelpText('Pick a category — it controls the colour of the badge on the site.')
    .build();
  sheet.getRange(2, 3, body, 1).setDataValidation(categoryRule);

  sheet.getRange(2, 5, body, 1).insertCheckboxes();
  sheet.getRange(2, 4, body, 1).setWrap(true);
  sheet.getRange(1, 1, maxRows, ANNOUNCEMENT_HEADERS.length).setVerticalAlignment('top');
}

function seedExampleEvent_(sheet) {
  sheet.appendRow([
    'Lava Lamp Social',
    'August 14, 2026',
    '4:00 PM - 5:30 PM',
    'Turtle Rock Clubhouse',
    'Build a personalised lava lamp and explore density, oil-water polarity and ' +
      'effervescent reactions. Bring a friend!',
    25,
    18,
    'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=800',
    true
  ]);
}

function seedExampleAnnouncement_(sheet) {
  sheet.appendRow([
    'Welcome to the new club website!',
    'August 1, 2026',
    'general',
    'Our new site is live. Events and announcements posted here now update the ' +
      'website automatically — no coding required.',
    true
  ]);
}

function ensurePublishedSheet_(ss) {
  var sheet = ss.getSheetByName(PUBLISHED_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PUBLISHED_SHEET);
    sheet.getRange('A1').setValue('');
    sheet
      .getRange('C1')
      .setValue(
        'This tab is written automatically when you click Publish. Do not edit it by hand.'
      );
    sheet.hideSheet();
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// Publish — snapshot the tabs into the JSON the website reads
// ---------------------------------------------------------------------------

/**
 * Reads both tabs, validates them, and stores a JSON snapshot that doGet serves.
 */
function publishToWebsite() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var eventsSheet = ss.getSheetByName(EVENTS_SHEET);
  var announcementsSheet = ss.getSheetByName(ANNOUNCEMENTS_SHEET);

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
  var events = readEvents_(eventsSheet, problems);
  var announcements = readAnnouncements_(announcementsSheet, problems);

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
    publishedAt: new Date().toISOString(),
    publishedBy: Session.getActiveUser().getEmail() || 'unknown'
  };

  var json = JSON.stringify(payload);

  // A single cell holds up to 50,000 characters — far more than a club needs,
  // but fail loudly rather than silently truncating.
  if (json.length > 45000) {
    ui.alert(
      'Too much content',
      'The published data is ' + json.length + ' characters, which is close to the ' +
        '50,000 character limit of a single cell.\n\nTrim some old events or ' +
        'announcements (untick "Show on Site") and publish again.',
      ui.ButtonSet.OK
    );
    return;
  }

  ensurePublishedSheet_(ss).getRange('A1').setValue(json);

  ui.alert(
    '🚀 Published!',
    'The website now shows:\n\n' +
      '  • ' + events.length + ' event(s)\n' +
      '  • ' + announcements.length + ' announcement(s)\n\n' +
      (problems.length ? '  • ' + problems.length + ' row(s) skipped\n\n' : '') +
      'Refresh the website to see the change.',
    ui.ButtonSet.OK
  );
}

function readEvents_(sheet, problems) {
  var rows = bodyRows_(sheet, EVENT_HEADERS.length);
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;

    if (isBlankRow_(row)) continue;
    if (row[8] === false) continue; // "Show on Site" unticked

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

    out.push({
      id: 'sheet-event-' + rowNumber,
      title: title,
      date: formatDate_(row[1]),
      time: String(row[2] || '').trim(),
      location: String(row[3] || '').trim(),
      description: String(row[4] || '').trim(),
      spotsTotal: total,
      spotsReserved: taken,
      image: String(row[7] || '').trim()
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

    var category = String(row[2] || 'general').trim().toLowerCase();
    if (ANNOUNCEMENT_CATEGORIES.indexOf(category) === -1) category = 'general';

    out.push({
      id: 'sheet-ann-' + rowNumber,
      title: title,
      date: formatDate_(row[1]),
      category: category,
      content: String(row[3] || '').trim()
    });
  }

  return out;
}

function bodyRows_(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) {
    // Checkboxes read as false on an otherwise empty row, so they do not count
    // as content.
    if (row[i] !== '' && row[i] !== null && row[i] !== false) return false;
  }
  return true;
}

function toWholeNumber_(value, fallback) {
  var n = Number(value);
  if (!isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

/**
 * Sheets hands back a Date object for date-formatted cells and a raw string for
 * anything typed as text. Normalise both into "August 14, 2026".
 */
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
// Web app — the URL the website fetches
// ---------------------------------------------------------------------------

/**
 * Serves the last published snapshot.
 * Supports ?callback=fn for JSONP, as a fallback if CORS ever misbehaves.
 */
function doGet(e) {
  var json;
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PUBLISHED_SHEET);
    json = sheet ? String(sheet.getRange('A1').getValue() || '') : '';
  } catch (err) {
    json = '';
  }

  if (!json) {
    json = JSON.stringify({
      events: [],
      announcements: [],
      publishedAt: null,
      note: 'Nothing published yet. Open the spreadsheet and click 🐢 Website ▸ Publish to Website.'
    });
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Helpers exposed on the menu
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
      'Deploy the web app first:\n\n' +
        'Deploy ▸ New deployment ▸ Web app\n' +
        '  Execute as: Me\n' +
        '  Who has access: Anyone\n\n' +
        'Then copy the /exec URL it gives you.',
      ui.ButtonSet.OK
    );
    return;
  }

  ui.alert(
    'Web app URL',
    url + '\n\nPaste this into src/config.ts on the website as SHEET_API_URL.',
    ui.ButtonSet.OK
  );
}

function previewPublishedJson() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PUBLISHED_SHEET);
  var json = sheet ? String(sheet.getRange('A1').getValue() || '') : '';

  ui.alert(
    'Currently published',
    json ? json.substring(0, 1500) + (json.length > 1500 ? '\n\n…truncated' : '') : 'Nothing published yet.',
    ui.ButtonSet.OK
  );
}
