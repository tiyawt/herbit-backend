import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const treeTrackerSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    totalGreenLeaves: { type: Number, default: 0, min: 0 },
    totalYellowLeaves: { type: Number, default: 0, min: 0 },
    totalFruitsHarvested: { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

treeTrackerSchema.index({ userId: 1, updatedAt: -1 });

const TreeTracker =
  mongoose.models.TreeTracker ||
  mongoose.model("TreeTracker", treeTrackerSchema, "treeTrackers");

export default TreeTracker;
