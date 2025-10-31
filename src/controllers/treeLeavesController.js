import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import TreeFruit from "../models/treeFruits.js";
import TreeLeaf from "../models/treeLeaves.js";
import TreeTracker from "../models/treeTrackers.js";



export const handleChecklistComplete = async (userId, checklistId) => {
  // cari daun kuning user
  const yellowLeaf = await TreeLeaf.findOne({ userId, status: "yellow" });

  if (yellowLeaf) {
    yellowLeaf.status = "green";
    yellowLeaf.needRecovery = false;
    yellowLeaf.statusChangedDate = new Date();
    await yellowLeaf.save();

    // update checklist agar menunjuk ke daun yang dikembalikan hijau
    await DailyTaskChecklist.findByIdAndUpdate(checklistId, {
      treeLeafId: yellowLeaf._id,
    });

    return yellowLeaf;
  }

  // kalau gak ada daun kuning, tambahin daun baru
  const newLeaf = new TreeLeaf({
    userId,
    dailyTaskChecklistId: checklistId,
    status: "green",
    dayNumber: await TreeLeaf.countDocuments({ userId }) + 1,
  });
  await newLeaf.save();

  // kaitkan daun baru dengan checklist
  await DailyTaskChecklist.findByIdAndUpdate(checklistId, {
    treeLeafId: newLeaf._id,
  });

  // update tracker
  await TreeTracker.findOneAndUpdate(
    { userId },
    {
      $inc: { totalGreenLeaves: 1 },
      lastActivityDate: new Date(),
    },
    { new: true, upsert: true }
  );

  // hitung total daun hijau
  const totalLeaves = await TreeLeaf.countDocuments({ userId, status: "green" });

  // kalau jumlah daun kelipatan 5 → buat buah baru
  if (totalLeaves % 5 === 0) {
    const newFruit = new TreeFruit({
      userId,
      treeTrackerId: newLeaf.treeTrackerId, // opsional
      harvestReadyDate: new Date(),
    });
    await newFruit.save();
    console.log(`🍎 Buah baru muncul untuk user ${userId} (total daun: ${totalLeaves})`);
  }

  return newLeaf;
};


// Cek siapa yang nggak nyelesain task harian
export const updateYellowLeavesForInactiveUsers = async () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  try {
    // Semua user yang punya checklist
    const allUsers = await DailyTaskChecklist.distinct("userId");

    // User yang minimal menyelesaikan 1 task kemarin
    const activeUsers = await DailyTaskChecklist.aggregate([
      {
        $match: {
          isCompleted: true,
          completedAt: { $gte: startOfYesterday, $lt: startOfToday },
        },
      },
      { $group: { _id: "$userId" } },
    ]);

    const activeUserIds = activeUsers.map(u => u._id.toString());
    const inactiveUsers = allUsers.filter(u => !activeUserIds.includes(u.toString()));

    // === Inactive users → ubah 1 daun hijau jadi kuning ===
    for (const userId of inactiveUsers) {
      const greenLeaf = await TreeLeaf.findOne({ userId, status: "green" }).sort({ createdAt: 1 });
      if (greenLeaf) {
        greenLeaf.status = "yellow";
        greenLeaf.needRecovery = true;
        greenLeaf.statusChangedDate = new Date();
        await greenLeaf.save();
        console.log(`🍂 User ${userId} tidak aktif, daun ${greenLeaf._id} menguning.`);
      }
    }

    // === Active users → ubah 1 daun kuning jadi hijau ===
    for (const userId of activeUserIds) {
      const yellowLeaf = await TreeLeaf.findOne({ userId, status: "yellow" }).sort({ createdAt: 1 });
      if (yellowLeaf) {
        yellowLeaf.status = "green";
        yellowLeaf.needRecovery = false;
        yellowLeaf.statusChangedDate = new Date();
        await yellowLeaf.save();
        console.log(`🌱 User ${userId} aktif, daun ${yellowLeaf._id} kembali hijau.`);
      }
    }

    console.log(`✅ Update selesai. Inactive: ${inactiveUsers.length}, Active: ${activeUserIds.length}`);
  } catch (error) {
    console.error("❌ Gagal update daun kuning:", error);
  }
};


// Hapus daun kalau checklist di-uncheck
export const handleChecklistUncheck = async (userId, checklistId) => {
  try {
    const deletedLeaf = await TreeLeaf.findOneAndDelete({
      userId,
      dailyTaskChecklistId: checklistId,
    });

    if (deletedLeaf) {
        await TreeTracker.findOneAndUpdate(
        { userId },
        { $inc: { totalGreenLeaves: -1 }, lastActivityDate: new Date() },
        { new: true }
        );

      console.log(`🍂 Daun ${deletedLeaf._id} dihapus karena checklist ${checklistId} di-uncheck`);
    } else {
      console.log(`⚠️ Tidak ada daun yang cocok untuk checklist ${checklistId}`);
    }
  } catch (error) {
    console.error("❌ Gagal menghapus daun:", error);
  }
};

export const getAvailableLeaves = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const leaves = await TreeLeaf.find({ userId });
    res.json({ leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};