import DailyTask from "../models/dailyTasks.js";

// fungsi random deterministik berdasar seed
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// fungsi shuffle deterministik
function shuffleArray(array, seed) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const getTodayTasks = async (req, res) => {
  try {
    const allTasks = await DailyTask.find();
    if (!allTasks || allTasks.length === 0) {
      return res.status(404).json({ message: "No tasks available" });
    }

    // ambil waktu sekarang (UTC), ubah ke WIB
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    // ubah ke jam 00:00 WIB (awal hari)
    const todayWIB = new Date(
      wibNow.getFullYear(),
      wibNow.getMonth(),
      wibNow.getDate(),
      0, 0, 0, 0
    );

    // buat tanggal dalam format YYYY-MM-DD
    const yyyy = todayWIB.getFullYear();
    const mm = String(todayWIB.getMonth() + 1).padStart(2, "0");
    const dd = String(todayWIB.getDate()).padStart(2, "0");

    const todayStr = `${yyyy}-${mm}-${dd}`;

    // seed deterministik berdasar tanggal WIB
    const seed = parseInt(`${yyyy}${mm}${dd}`);

    // acak tugas berdasar seed
    const shuffled = shuffleArray(allTasks, seed);
    const selected = shuffled.slice(0, 5);

    res.status(200).json({
      date: todayStr,
      tasks: selected,
    });
  } catch (error) {
    console.error("Error fetching today's tasks:", error);
    res.status(500).json({ message: "Server error" });
  }
};
