// utils/date.js
export function daysBetween(a, b) {
  const tz = "Asia/Jakarta";
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((B - A) / (1000 * 60 * 60 * 24));
}

export const WIB_TZ = "Asia/Jakarta";
const _fmtWIB = new Intl.DateTimeFormat("sv-SE", {
  timeZone: WIB_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function startEndOfWIBDayUTC(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const startUTC = new Date(Date.UTC(y, m - 1, d, 17, 0, 0, 0));
  const endUTC   = new Date(Date.UTC(y, m - 1, d + 1, 16, 59, 59, 999));
  return { startUTC, endUTC };
}


export function todayBucketWIB(date = new Date()) {
  return _fmtWIB.format(date); 
}

export function yesterdayBucketFrom(date = new Date()) {
  const [y, m, d] = todayBucketWIB(date).split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000; 
  const back = new Date(utc);
  return todayBucketWIB(back);
}
