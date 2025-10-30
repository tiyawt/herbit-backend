// controllers/dailytaskchecklist.controller.js
import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTasks.js";
import TreeLeaf from "../models/treeLeaves.js"; // ✅ tambahkan import ini
import { handleChecklistComplete, handleChecklistUncheck } from "./treeLeavesController.js";

// Get all checklist for a specific user
export const getChecklistByUser = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const checklist = await DailyTaskChecklist.find({ userId })
      .populate("dailyTaskId")
      .populate("treeLeafId");

    res.json({ checklists: checklist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Mark checklist as completed (versi diperbarui)
export const markComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user.id;

    const checklist = await DailyTaskChecklist.findById(id);
    if (!checklist) return res.status(404).json({ message: "Checklist not found" });

    checklist.isCompleted = true;
    checklist.completedAt = new Date();
    await checklist.save();

    // Jalankan fungsi tambahan (bikin daun)
    const newLeaf = await handleChecklistComplete(userId, checklist._id);

    // Simpan ID daun yang dibuat di checklist
    checklist.treeLeafId = newLeaf._id;
    await checklist.save();

    res.json({ message: "Checklist marked as completed", checklist });
  } catch (error) {
    console.error("Error markComplete:", error);
    res.status(500).json({ message: error.message });
  }
};


// Uncheck checklist
export const uncheck = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user.id;

    const checklist = await DailyTaskChecklist.findById(id);
    if (!checklist) return res.status(404).json({ message: "Checklist not found" });

    checklist.isCompleted = false;
    checklist.completedAt = null;
    await checklist.save();

    // 🔹 Hapus daun yang terkait checklist ini
    await handleChecklistUncheck(userId, checklist._id);

    res.json({ message: "Checklist unchecked", checklist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Generate daily checklist
export const generateDailyChecklist = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingChecklists = await DailyTaskChecklist.find({
      userId,
      createdAt: { $gte: today },
    });

    if (existingChecklists.length > 0) {
      return res.status(400).json({ message: "Checklist hari ini sudah dibuat." });
    }

    const dailyTasks = await DailyTask.find();
    if (!dailyTasks.length) {
      return res.status(404).json({ message: "Tidak ada daily task yang tersedia." });
    }

    const newChecklist = dailyTasks.map((task) => ({
      userId,
      dailyTaskId: task._id,
      isCompleted: false,
    }));

    await DailyTaskChecklist.insertMany(newChecklist);

    res.status(201).json({
      message: "Checklist harian berhasil dibuat.",
      count: newChecklist.length,
    });
  } catch (error) {
    console.error("Error generate checklist:", error);
    res.status(500).json({ message: "Gagal generate checklist." });
  }
};
