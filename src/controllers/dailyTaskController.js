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

    // Ambil tanggal lokal (misal WIB)
    const todayLocal = new Date().toLocaleDateString("id-ID"); // hasil: "28/10/2025"
    const [day, month, year] = todayLocal.split("/");

    // Seed deterministik dari tanggal lokal
    const seed = parseInt(`${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`);

    const shuffled = shuffleArray(allTasks, seed);
    const selected = shuffled.slice(0, 5);

    res.status(200).json({
      date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`, // format YYYY-MM-DD
      tasks: selected,
    });
  } catch (error) {
    console.error("Error fetching today's tasks:", error);
    res.status(500).json({ message: "Server error" });
  }
};
