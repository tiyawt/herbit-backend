// utils/date.js
export function daysBetween(a, b) {
  // Normalisasi ke 00:00 WIB kedua tanggal
  const tz = "Asia/Jakarta";
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((B - A) / (1000 * 60 * 60 * 24));
}
