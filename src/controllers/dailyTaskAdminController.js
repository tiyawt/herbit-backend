import DailyTask from "../models/dailyTasks.js";

// GET /admin/dailytasks
export const listDailyTasksAdminHandler = async (req, res) => {
  try {
    const tasks = await DailyTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch daily tasks", error: err.message });
  }
};

// GET /admin/dailytasks/:taskId
export const getDailyTaskAdminHandler = async (req, res) => {
  try {
    const task = await DailyTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Daily task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch daily task", error: err.message });
  }
};

// POST /admin/dailytasks
export const createDailyTaskAdminHandler = async (req, res) => {
  try {
    const { title, category, symbol } = req.body;
    const task = await DailyTask.create({ title, category, symbol });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: "Failed to create daily task", error: err.message });
  }
};

// PATCH /admin/dailytasks/:taskId
export const updateDailyTaskAdminHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const task = await DailyTask.findByIdAndUpdate(taskId, updates, { new: true });
    if (!task) return res.status(404).json({ message: "Daily task not found" });
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: "Failed to update daily task", error: err.message });
  }
};

// DELETE /admin/dailytasks/:taskId
export const deleteDailyTaskAdminHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = await DailyTask.findByIdAndDelete(taskId);
    if (!deleted) return res.status(404).json({ message: "Daily task not found" });
    res.json({ message: "Daily task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete daily task", error: err.message });
  }
};
