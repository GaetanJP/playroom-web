/**
 * Google Apps Script for the Playroom sign-up form.
 *
 * Same setup as book-web: the website POSTs JSON here and this script appends a row to a
 * Google Sheet. Paste this whole file into Extensions > Apps Script on the sheet, then
 * Deploy > New deployment > Web app, "Execute as: Me", "Who has access: Anyone".
 * Put the /exec URL in config.js as signupUrl. Full steps: README.md.
 *
 * Differences from book-web's script:
 *  - email only (no name), plus source/page columns;
 *  - repeat sign-ups for the same email are ignored instead of duplicated;
 *  - values are written as plain text, so a submission can't become a spreadsheet formula;
 *  - a lock serialises concurrent submissions so the duplicate check holds.
 */

const SHEET_NAME = 'Signups';
const HEADERS = ['Email', 'Timestamp', 'Source', 'Page'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const email = String(data.email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return json({ status: 'error', message: 'invalid_email' });
    }

    const sheet = getSheet();
    const last = sheet.getLastRow();
    if (last > 1) {
      const existing = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < existing.length; i++) {
        if (String(existing[i][0]).trim().toLowerCase() === email) {
          return json({ status: 'success', message: 'already_signed_up' });
        }
      }
    }

    const row = [
      email,
      new Date(),
      clip(data.source, 40),
      clip(data.page, 120),
    ];
    const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
    // '@' = plain text for the user-supplied columns; column B stays a real date.
    sheet.getRange(target.getRow(), 1).setNumberFormat('@');
    sheet.getRange(target.getRow(), 3, 1, 2).setNumberFormat('@');
    target.setValues([row]);
    sheet.getRange(target.getRow(), 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');

    return json({ status: 'success', message: 'saved' });
  } catch (error) {
    console.error(error);
    return json({ status: 'error', message: String(error) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) { /* lock was never taken */ }
  }
}

function doGet() {
  return json({ status: 'success', message: 'Playroom sign-up handler is running.' });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Plain text, length-capped, and never starting with a formula character. */
function clip(value, max) {
  let s = String(value == null ? '' : value).slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** Run from the Apps Script editor to check the sheet is wired up. */
function testScript() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        email: 'test@example.com',
        source: 'apps-script-test',
        page: '/',
        timestamp: new Date().toISOString(),
      }),
    },
  });
  Logger.log(result.getContent());
}
