import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const treeFruitSchema = new Schema(
  {
    treeTrackerId: {
      type: Types.ObjectId,
      ref: "TreeTracker",
      required: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    harvestReadyDate: { type: Date, required: true },
    isClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

treeFruitSchema.index({ userId: 1, harvestReadyDate: -1 });

const TreeFruit =
  mongoose.models.TreeFruit ||
  mongoose.model("TreeFruit", treeFruitSchema, "treeFruits");

export default TreeFruit;
