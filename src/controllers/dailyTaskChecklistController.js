import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTasks.js";
import TreeLeaf from "../models/treeLeaves.js"; 
import { handleChecklistComplete, handleChecklistUncheck } from "./treeLeavesController.js";

// fungsi random deterministik
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

// ✅ Ambil / generate checklist harian (otomatis buat kalau belum ada)
export const getTodayTasks = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    // --- 💡 WIB fix (UTC+7) ---
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7 offset
    const todayWIB = new Date(
      wibNow.getFullYear(),
      wibNow.getMonth(),
      wibNow.getDate(),
      0, 0, 0, 0 // ⏰ jam 00:00 WIB
    );

    const yyyy = todayWIB.getFullYear();
    const mm = String(todayWIB.getMonth() + 1).padStart(2, "0");
    const dd = String(todayWIB.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // seed deterministik berdasar tanggal WIB
    const seed = parseInt(`${yyyy}${mm}${dd}`);

    // ambil semua task dan pilih 5 secara deterministik
    const allTasks = await DailyTask.find();
    if (!allTasks.length)
      return res.status(404).json({ message: "Tidak ada daily task yang tersedia." });

    const shuffled = shuffleArray(allTasks, seed);
    const selected = shuffled.slice(0, 5);

    // pastikan checklist user sudah ada
    const tasksWithChecklist = await Promise.all(
      selected.map(async (task) => {
        let checklist = await DailyTaskChecklist.findOne({
          userId,
          dailyTaskId: task._id,
        }).populate("treeLeafId");

        if (!checklist) {
          checklist = await DailyTaskChecklist.create({
            userId,
            dailyTaskId: task._id,
            isCompleted: false,
          });
        }

        return {
          _id: checklist._id,
          dailyTaskId: task._id,
          title: task.title,
          category: task.category,
          symbol: task.symbol,
          isCompleted: checklist.isCompleted,
          treeLeafId: checklist.treeLeafId,
        };
      })
    );

    res.status(200).json({
      date: todayStr, // YYYY-MM-DD (WIB)
      tasks: tasksWithChecklist,
    });
  } catch (error) {
    console.error("Error getTodayTasks:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Mark checklist as completed (buat daun baru)
export const markComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user.id;

    const checklist = await DailyTaskChecklist.findById(id);
    if (!checklist)
      return res.status(404).json({ message: "Checklist not found" });

    checklist.isCompleted = true;
    checklist.completedAt = new Date();
    await checklist.save();

    // 🌿 Panggil fungsi di treeLeavesController
    const newLeaf = await handleChecklistComplete(userId, checklist._id);
    checklist.treeLeafId = newLeaf._id;
    await checklist.save();

    res.json({ message: "Checklist marked as completed", checklist });
  } catch (error) {
    console.error("Error markComplete:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔁 Uncheck checklist (hapus daun)
export const uncheck = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user.id;

    const checklist = await DailyTaskChecklist.findById(id);
    if (!checklist)
      return res.status(404).json({ message: "Checklist not found" });

    checklist.isCompleted = false;
    checklist.completedAt = null;
    await checklist.save();

    await handleChecklistUncheck(userId, checklist._id);

    res.json({ message: "Checklist unchecked", checklist });
  } catch (error) {
    console.error("Error uncheck:", error);
    res.status(500).json({ message: error.message });
  }
};

// (opsional) ambil semua checklist user
export const getChecklistByUser = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const checklist = await DailyTaskChecklist.find({ userId })
      .populate("dailyTaskId")
      .populate("treeLeafId");

    const tasks = checklist.map((item) => ({
      _id: item._id,
      dailyTaskId: item.dailyTaskId?._id,
      title: item.dailyTaskId?.title,
      description: item.dailyTaskId?.description,
      category: item.dailyTaskId?.category,
      isCompleted: item.isCompleted,
      completedAt: item.completedAt,
      treeLeafId: item.treeLeafId?._id || null,
    }));

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
