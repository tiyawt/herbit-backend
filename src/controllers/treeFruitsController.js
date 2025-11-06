import TreeFruit from "../models/treeFruits.js";
import TreeTracker from "../models/treeTrackers.js";
import user from "../models/user.js";
import { recordPointsChange } from "../services/pointsHistoryService.js";


// Ambil semua buah user (yang belum dipanen)
export const getAvailableFruits = async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const fruits = await TreeFruit.find({ userId, isClaimed: false });
    res.json({ fruits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Claim / panen buah
export const claimFruit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user.id;

    const fruit = await TreeFruit.findOne({ _id: id, userId });
    if (!fruit) return res.status(404).json({ message: "Buah tidak ditemukan." });
    if (fruit.isClaimed) return res.status(400).json({ message: "Buah sudah dipanen." });

    // tandai buah sudah dipanen
    fruit.isClaimed = true;
    fruit.claimedAt = new Date();
    fruit.pointsAwarded = 10;
    await fruit.save();

    // tambahkan poin ke user
    await user.findByIdAndUpdate(userId, { $inc: { totalPoints: 10 } });

     await TreeTracker.findOneAndUpdate(
      { userId },
      {
        $inc: { totalFruitsHarvested: 1 },
        lastActivityDate: new Date(),
      },
      { new: true }
    );

    await recordPointsChange({
      userId,
      pointsAmount: fruit.pointsAwarded ?? 0,
      source: "tree",
      referenceId: fruit._id?.toString() ?? null,
      createdAt: fruit.claimedAt ?? new Date(),
    });

    res.json({
      message: "Buah berhasil dipanen 🍎 +10 poin!",
      fruit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
