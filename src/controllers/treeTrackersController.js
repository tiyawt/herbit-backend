import TreeTracker from "../models/treeTrackers.js";
import User from "../models/user.js";

// Buat TreeTracker otomatis untuk user baru
export const createTreeTrackerForUser = async (userId) => {
  try {
    // Cek apakah user sudah punya tree tracker
    const existingTracker = await TreeTracker.findOne({ userId });
    if (existingTracker) return existingTracker;

    // Kalau belum, buat tracker baru
    const newTracker = new TreeTracker({
      userId,
      totalGreenLeaves: 0,
      totalYellowLeaves: 0,
      totalFruitsHarvested: 0,
      lastActivityDate: new Date(),
    });

    await newTracker.save();
    console.log(`🌱 TreeTracker baru dibuat untuk user ${userId}`);
    return newTracker;
  } catch (error) {
    console.error("❌ Gagal membuat TreeTracker:", error);
    throw error;
  }
};

 console.log("📘 [createTreeTrackerForUser]")
// Ambil data tree tracker user
export const getTreeTracker = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const tracker = await TreeTracker.findOne({ userId });

    if (!tracker)
      return res.status(404).json({ message: "Tree tracker belum dibuat." });

    res.json({ tracker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update data tracker manual (opsional, misalnya admin)
export const updateTreeTracker = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const { totalGreenLeaves, totalYellowLeaves, totalFruitsHarvested } =
      req.body;

    const tracker = await TreeTracker.findOneAndUpdate(
      { userId },
      {
        $set: {
          totalGreenLeaves,
          totalYellowLeaves,
          totalFruitsHarvested,
          lastActivityDate: new Date(),
        },
      },
      { new: true }
    );

    if (!tracker)
      return res.status(404).json({ message: "Tree tracker tidak ditemukan." });

    res.json({ message: "Tree tracker diperbarui.", tracker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Buat TreeTracker manual (untuk user lama)
export const createNewTreeTracker = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    // Cek apakah user sudah punya tracker
    const existingTracker = await TreeTracker.findOne({ userId });
    if (existingTracker) {
      return res.status(400).json({
        message: "Kamu sudah punya pohon. Tidak bisa membuat yang baru.",
        tracker: existingTracker,
      });
    }

    // Buat tracker baru
    const newTracker = new TreeTracker({
      userId,
      totalGreenLeaves: 0,
      totalYellowLeaves: 0,
      totalFruitsHarvested: 0,
      lastActivityDate: new Date(),
    });

    await newTracker.save();

    res.status(201).json({
      message: "Pohon baru berhasil dibuat 🌱",
      tracker: newTracker,
    });
  } catch (error) {
    console.error("❌ Error createNewTreeTracker:", error);
    res.status(500).json({ message: "Gagal membuat pohon baru." });
  }
};
