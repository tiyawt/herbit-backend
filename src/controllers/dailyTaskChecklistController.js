// controllers/dailytaskchecklist.controller.js
import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTasks.js";

// Get all checklist for a specific user
export const getChecklistByUser = async (req, res) => {
  try {
    const checklist = await DailyTaskChecklist.find({ userId: req.user.id })
      .populate("dailyTaskId")
      .populate("treeLeafId");

    res.json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark checklist as completed
export const markComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const checklist = await DailyTaskChecklist.findById(id);

    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }

    checklist.isCompleted = true;
    checklist.completedAt = new Date();
    await checklist.save();

    res.json({
      message: "Checklist marked as completed",
      checklist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Uncheck checklist (set to not completed)
export const uncheck = async (req, res) => {
  try {
    const { id } = req.params;
    const checklist = await DailyTaskChecklist.findById(id);

    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }

    checklist.isCompleted = false;
    checklist.completedAt = null;
    await checklist.save();

    res.json({
      message: "Checklist unchecked",
      checklist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate daily checklist for user
export const generateDailyChecklist = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cek apakah user sudah punya checklist hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingChecklist = await DailyTaskChecklist.findOne({
      userId,
      createdAt: { $gte: today }
    });

    if (existingChecklist) {
      return res.status(400).json({ message: "Checklist hari ini sudah dibuat." });
    }

    // Ambil semua task
    const dailyTasks = await DailyTask.find();

    if (!dailyTasks.length) {
      return res.status(404).json({ message: "Tidak ada daily task yang tersedia." });
    }

    // Generate checklist baru
    const newChecklist = dailyTasks.map(task => ({
      userId,
      dailyTaskId: task._id,
      isCompleted: false
    }));

    await DailyTaskChecklist.insertMany(newChecklist);

    res.status(201).json({
      message: "Checklist harian berhasil dibuat.",
      count: newChecklist.length
    });
  } catch (error) {
    console.error("Error generate checklist:", error);
    res.status(500).json({ message: "Gagal generate checklist." });
  }
};
