import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import WeeklyProgress from "../models/weeklyProgress.js";

// ✅ Ambil progress mingguan (7 hari terakhir, mulai jam 00:00 WIB)
export const getWeeklyProgress = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    // ambil waktu lokal WIB
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    // set ke jam 00:00 WIB (bukan UTC)
    const today = new Date(
      wibNow.getFullYear(),
      wibNow.getMonth(),
      wibNow.getDate(),
      0, 0, 0, 0
    );

    // tentukan 7 hari ke belakang (termasuk hari ini)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    // ambil semua checklist dalam rentang waktu ini
    const checklists = await DailyTaskChecklist.find({
      userId,
      completedAt: {
        $gte: new Date(weekStart.getTime() - 7 * 60 * 60 * 1000),
        $lte: new Date(today.getTime() + 17 * 60 * 60 * 1000), // sampai 23:59 WIB
      },
    }).populate("dailyTaskId");

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);

      // tentukan rentang 00:00 - 23:59 WIB
      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      // konversi waktu checklist ke WIB untuk dibandingkan
      const dayChecklists = checklists.filter((c) => {
        const completedAtLocal = new Date(
          new Date(c.completedAt).getTime() + 7 * 60 * 60 * 1000
        );
        return completedAtLocal >= dayStart && completedAtLocal <= dayEnd;
      });

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
