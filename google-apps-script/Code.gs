/**
 * @OnlyCurrentDoc
 *
 * ============================================================================
 * SPLITSHEET — GOOGLE SHEETS BACKEND (Google Apps Script)
 * ============================================================================
 *
 * NOTE ON GOOGLE ADVANCED PROTECTION:
 * The `@OnlyCurrentDoc` annotation above restricts this script's OAuth scope
 * strictly to `https://www.googleapis.com/auth/spreadsheets.currentonly`
 * (only this single spreadsheet) instead of full account-wide Drive/Sheets access.
 *
 * SUPPORTS MULTIPLE ACCOUNTS / GROUPS IN ONE SPREADSHEET:
 * All expenses across all your accounts/groups are stored in the `Transactions`
 * tab with `accountId` and `accountName` columns, and account definitions are
 * synced in the `Config` tab (`accountsJson`).
 */

const SECRET_KEY = 'change-me-secret-key';

const TRANSACTIONS_SHEET = 'Transactions';
const CONFIG_SHEET = 'Config';
const DASHBOARD_SHEET = 'Dashboard';

const HEADERS = [
  'id',
  'date',
  'title',
  'amount',
  'currency',
  'exchangeRate',
  'baseAmount',
  'paidBy',
  'splitType',
  'userAShare',
  'category',
  'notes',
  'isDeleted',
  'updatedAt',
  'accountId',
  'accountName'
];

/**
 * Validates the shared secret passed from the PWA.
 */
function isAuthorized(providedSecret) {
  const propSecret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  const activeSecret = propSecret || SECRET_KEY;
  return providedSecret && String(providedSecret).trim() === String(activeSecret).trim();
}

/**
 * Automatically initializes or upgrades the spreadsheet tabs and formatting.
 * Can also be run manually from the Apps Script editor toolbar.
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Transactions Sheet
  let txSheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!txSheet) {
    txSheet = ss.insertSheet(TRANSACTIONS_SHEET);
  }
  if (txSheet.getLastRow() === 0) {
    txSheet.appendRow(HEADERS);
    const headerRange = txSheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#c4b5fd');
    headerRange.setFontColor('#1e1b2e');
    headerRange.setFontWeight('bold');
    txSheet.setFrozenRows(1);
    txSheet.setColumnWidth(1, 140); // id
    txSheet.setColumnWidth(2, 110); // date
    txSheet.setColumnWidth(3, 220); // title
    txSheet.setColumnWidth(4, 100); // amount
    txSheet.setColumnWidth(7, 110); // baseAmount
    txSheet.setColumnWidth(11, 130); // category
    txSheet.setColumnWidth(12, 240); // notes
    txSheet.setColumnWidth(15, 130); // accountId
    txSheet.setColumnWidth(16, 160); // accountName
  } else {
    // Auto-upgrade existing 14-column sheet to 16 columns (accountId, accountName)
    const existingHeader = txSheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (existingHeader[14] !== 'accountId' || existingHeader[15] !== 'accountName') {
      txSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      const headerRange = txSheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#c4b5fd');
      headerRange.setFontColor('#1e1b2e');
      headerRange.setFontWeight('bold');
      txSheet.setColumnWidth(15, 130);
      txSheet.setColumnWidth(16, 160);
    }
  }

  // 2. Config Sheet
  let cfgSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!cfgSheet) {
    cfgSheet = ss.insertSheet(CONFIG_SHEET);
    cfgSheet.appendRow(['key', 'value']);
    cfgSheet.getRange(1, 1, 1, 2).setBackground('#c4b5fd').setFontColor('#1e1b2e').setFontWeight('bold');
    cfgSheet.setFrozenRows(1);
    cfgSheet.appendRow(['userAName', 'Partner A']);
    cfgSheet.appendRow(['userBName', 'Partner B']);
    cfgSheet.appendRow(['baseCurrency', 'EUR']);
    cfgSheet.appendRow(['defaultSplitA', '50']);
    cfgSheet.appendRow([
      'accountsJson',
      JSON.stringify([{ id: 'everyday', name: 'Everyday', emoji: '🏠', createdAt: 1 }])
    ]);
  }

  // 3. Live Google Drive Dashboard Sheet (for viewing directly in Google Sheets!)
  let dashSheet = ss.getSheetByName(DASHBOARD_SHEET);
  if (!dashSheet) {
    dashSheet = ss.insertSheet(DASHBOARD_SHEET, 0);
    dashSheet.getRange('A1').setValue('SplitSheet — Live Google Drive Overview').setFontSize(14).setFontWeight('bold').setFontColor('#6d28d9');
    dashSheet.getRange('A3:B3').setValues([['Metric', 'Value']]).setBackground('#c4b5fd').setFontColor('#1e1b2e').setFontWeight('bold');
    dashSheet.getRange('A4:B9').setValues([
      ['Partner A Name', '=IFERROR(VLOOKUP("userAName", Config!A:B, 2, FALSE), "Partner A")'],
      ['Partner B Name', '=IFERROR(VLOOKUP("userBName", Config!A:B, 2, FALSE), "Partner B")'],
      ['Base Currency', '=IFERROR(VLOOKUP("baseCurrency", Config!A:B, 2, FALSE), "EUR")'],
      ['Total Active Expenses (All Accounts)', '=SUMIFS(Transactions!G:G, Transactions!M:M, FALSE, Transactions!I:I, "<>settlement")'],
      ['Partner A Total Paid', '=SUMIFS(Transactions!G:G, Transactions!M:M, FALSE, Transactions!H:H, "userA")'],
      ['Partner B Total Paid', '=SUMIFS(Transactions!G:G, Transactions!M:M, FALSE, Transactions!H:H, "userB")'],
    ]);
    dashSheet.setColumnWidth(1, 280);
    dashSheet.setColumnWidth(2, 180);
  }

  return { txSheet, cfgSheet, ss };
}

/**
 * Reads all rows from the Transactions sheet.
 */
function readAllTransactions(txSheet, ss) {
  const lastRow = txSheet.getLastRow();
  if (lastRow <= 1) return [];

  const tz = (ss && ss.getSpreadsheetTimeZone && ss.getSpreadsheetTimeZone()) || 'UTC';
  const numCols = Math.max(txSheet.getLastColumn(), HEADERS.length);
  const data = txSheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  const expenses = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id) continue;

    let dateStr = row[1];
    if (dateStr instanceof Date) {
      dateStr = Utilities.formatDate(dateStr, tz, 'yyyy-MM-dd');
    } else {
      dateStr = String(dateStr || '').slice(0, 10);
    }

    expenses.push({
      id: id,
      date: dateStr,
      title: String(row[2] || ''),
      amount: Number(row[3]) || 0,
      currency: String(row[4] || 'EUR'),
      exchangeRate: Number(row[5]) || 1,
      baseAmount: Number(row[6]) || Number(row[3]) || 0,
      paidBy: String(row[7] || 'userA'),
      splitType: String(row[8] || '50-50'),
      userAShare: Number(row[9]) || 0,
      category: String(row[10] || 'Other'),
      notes: String(row[11] || ''),
      isDeleted: row[12] === true || String(row[12]).toUpperCase() === 'TRUE',
      updatedAt: Number(row[13]) || 0,
      accountId: String(row[14] || 'everyday').trim() || 'everyday',
      accountName: String(row[15] || 'Everyday').trim() || 'Everyday'
    });
  }

  return expenses;
}

/**
 * Reads and optionally updates shared couple config (including accountsJson) in the Config tab.
 */
function syncConfig(cfgSheet, incomingConfig) {
  const lastRow = cfgSheet.getLastRow();
  const map = {};
  if (lastRow > 1) {
    const rows = cfgSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    rows.forEach((r, idx) => {
      if (r[0]) map[String(r[0])] = { value: String(r[1] ?? ''), rowIndex: idx + 2 };
    });
  }

  if (incomingConfig && typeof incomingConfig === 'object') {
    const allowedKeys = ['userAName', 'userBName', 'baseCurrency', 'defaultSplitA', 'accountsJson'];
    allowedKeys.forEach((k) => {
      if (incomingConfig[k] !== undefined && incomingConfig[k] !== null && String(incomingConfig[k]).trim() !== '') {
        const val = String(incomingConfig[k]).trim();
        if (map[k]) {
          cfgSheet.getRange(map[k].rowIndex, 2).setValue(val);
          map[k].value = val;
        } else {
          cfgSheet.appendRow([k, val]);
          map[k] = { value: val, rowIndex: cfgSheet.getLastRow() };
        }
      }
    });
  }

  const result = {};
  Object.keys(map).forEach((k) => {
    result[k] = map[k].value;
  });
  return result;
}

/**
 * Upserts a batch of expenses into the Transactions sheet atomically.
 */
function upsertTransactions(txSheet, upserts) {
  if (!Array.isArray(upserts) || upserts.length === 0) return 0;

  const lastRow = txSheet.getLastRow();
  const idToRow = {};

  if (lastRow > 1) {
    const existingIds = txSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const existingUpdated = txSheet.getRange(2, 14, lastRow - 1, 1).getValues();
    for (let i = 0; i < existingIds.length; i++) {
      const id = String(existingIds[i][0] || '').trim();
      if (id) {
        idToRow[id] = {
          rowNumber: i + 2,
          updatedAt: Number(existingUpdated[i][0]) || 0
        };
      }
    }
  }

  const rowsToAppend = [];
  let updatedCount = 0;

  for (let i = 0; i < upserts.length; i++) {
    const item = upserts[i];
    if (!item || !item.id) continue;

    const rowValues = [
      String(item.id),
      String(item.date || '').slice(0, 10),
      String(item.title || ''),
      Number(item.amount) || 0,
      String(item.currency || 'EUR'),
      Number(item.exchangeRate) || 1,
      Number(item.baseAmount) || Number(item.amount) || 0,
      String(item.paidBy || 'userA'),
      String(item.splitType || '50-50'),
      Number(item.userAShare) || 0,
      String(item.category || 'Other'),
      String(item.notes || ''),
      Boolean(item.isDeleted),
      Number(item.updatedAt) || Date.now(),
      String(item.accountId || 'everyday'),
      String(item.accountName || 'Everyday')
    ];

    const existing = idToRow[item.id];
    if (existing) {
      if ((Number(item.updatedAt) || 0) >= existing.updatedAt) {
        txSheet.getRange(existing.rowNumber, 1, 1, HEADERS.length).setValues([rowValues]);
        updatedCount++;
      }
    } else {
      rowsToAppend.push(rowValues);
      updatedCount++;
    }
  }

  if (rowsToAppend.length > 0) {
    const startRow = txSheet.getLastRow() + 1;
    txSheet.getRange(startRow, 1, rowsToAppend.length, HEADERS.length).setValues(rowsToAppend);
  }

  return updatedCount;
}

/**
 * Handles GET requests (e.g., ?action=sync&secret=...)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (!isAuthorized(params.secret)) {
      return jsonResponse({ ok: false, error: 'Unauthorized: Invalid Secret Key' });
    }

    const { txSheet, cfgSheet, ss } = setupSheet();
    const expenses = readAllTransactions(txSheet, ss);
    const config = syncConfig(cfgSheet, null);

    return jsonResponse({
      ok: true,
      sheetName: ss.getName(),
      sheetUrl: ss.getUrl(),
      config: config,
      expenses: expenses,
      serverTime: Date.now()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/**
 * Handles POST requests (Sent with Content-Type: text/plain;charset=utf-8 to avoid CORS preflight)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(rawBody);

    if (!isAuthorized(body.secret)) {
      return jsonResponse({ ok: false, error: 'Unauthorized: Invalid Secret Key' });
    }

    const { txSheet, cfgSheet, ss } = setupSheet();

    const upsertedCount = upsertTransactions(txSheet, body.upserts || []);
    const config = syncConfig(cfgSheet, body.config || null);
    SpreadsheetApp.flush();

    const expenses = readAllTransactions(txSheet, ss);

    return jsonResponse({
      ok: true,
      upsertedCount: upsertedCount,
      sheetName: ss.getName(),
      sheetUrl: ss.getUrl(),
      config: config,
      expenses: expenses,
      serverTime: Date.now()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
