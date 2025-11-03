import mongoose from "mongoose";

const treeTrackerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 user hanya punya 1 pohon
    },

    // Jumlah daun hijau saat ini
    totalGreenLeaves: {
      type: Number,
      default: 0,
    },

    // Jumlah daun kuning saat ini
    totalYellowLeaves: {
      type: Number,
      default: 0,
    },

    // Jumlah buah yang sudah dipanen
    totalFruitsHarvested: {
      type: Number,
      default: 0,
    },

    // Tanggal terakhir user melakukan aktivitas (checklist complete)
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // otomatis buat createdAt & updatedAt
  }
);

const TreeTracker = mongoose.model("TreeTracker", treeTrackerSchema, "treeTrackers");

export default TreeTracker;
