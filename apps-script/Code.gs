/**
 * WARDROBE REFRESH · TOP SPENDER — Google Apps Script data source
 *
 * Only needed if you prefer Apps Script over "Publish to web".
 * If you ALREADY have a working Apps Script, you can keep it: the website
 * accepts most JSON shapes (see the guide). Use this file only if yours
 * doesn't work with the new design.
 *
 * Setup:
 *  1. Open your Google Sheet → Extensions → Apps Script.
 *  2. Replace everything in Code.gs with this file, change SHEET_NAME if needed, Save.
 *  3. Deploy → New deployment → type "Web app"
 *       Execute as: Me
 *       Who has access: Anyone
 *     → Deploy → copy the Web app URL (ends with /exec).
 *  4. Paste that URL into js/config.js → appsScriptUrl.
 *
 * After editing this script later: Deploy → Manage deployments → Edit (pencil)
 * → Version: "New version" → Deploy. The URL stays the same.
 */

var SHEET_NAME = 'Sheet1';   // the tab that holds the data
// Row 1 must have headers, e.g.  Name | Total Spending

function doGet(e) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME)
           || SpreadsheetApp.getActive().getSheets()[0];
  var values = sheet.getDataRange().getValues();
  var headers = values.shift().map(String);

  var rows = values
    .filter(function (r) { return r.join('').trim() !== ''; })
    .map(function (r) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });

  var json = JSON.stringify(rows);

  // JSONP support (?callback=fn) for older setups
  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[\w.$]+$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
