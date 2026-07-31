// All "dateKey" strings across the app are IST calendar days (YYYY-MM-DD),
// independent of server timezone (Render runs UTC).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDateKey(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
}

function istDateKeyDaysAgo(n) {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  now.setUTCDate(now.getUTCDate() - n);
  return now.toISOString().slice(0, 10);
}

module.exports = { toISTDateKey, istDateKeyDaysAgo, IST_OFFSET_MS };
