import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import WeeklyProgress from "../models/weeklyProgress.js";

// ✅ Ambil progress mingguan (7 hari terakhir)
export const getWeeklyProgress = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    // ambil tanggal hari ini (lokal WIB)
    const now = new Date();
    const localNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const today = new Date(localNow.toISOString().split("T")[0]);

    // tentukan rentang 7 hari ke belakang
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    // ambil checklist user dalam rentang waktu ini
    const checklists = await DailyTaskChecklist.find({
      userId,
      completedAt: { $gte: weekStart, $lte: today },
    }).populate("dailyTaskId");

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);

      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayChecklists = checklists.filter(
        (c) => c.completedAt >= dayStart && c.completedAt <= dayEnd
      );

      result.push({
        dayName: dayNames[day.getDay()],
        date: day.toISOString().split("T")[0],
        completed: dayChecklists.length,
        total: 5,
        progress: Math.round((dayChecklists.length / 5) * 100),
      });
    }

    const totalCompleted = result.reduce((sum, d) => sum + d.completed, 0);
    const avgProgress = Math.round(result.reduce((sum, d) => sum + d.progress, 0) / 7);

    // 🔹 Simpan / update ke koleksi weeklyProgress
    const weekly = await WeeklyProgress.findOneAndUpdate(
      { userId, weekStart, weekEnd: today },
      {
        userId,
        weekStart,
        weekEnd: today,
        progress: result,
        totalCompleted,
        avgProgress,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      userId,
      weekStart: weekly.weekStart.toISOString().split("T")[0],
      weekEnd: weekly.weekEnd.toISOString().split("T")[0],
      totalCompleted: weekly.totalCompleted,
      avgProgress: weekly.avgProgress,
      progress: weekly.progress,
    });
  } catch (error) {
    console.error("Error getWeeklyProgress:", error);
    res.status(500).json({ message: "Server error" });
  }
};


