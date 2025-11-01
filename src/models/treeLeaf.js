import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const treeLeafSchema = new Schema(
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
    dailyTaskChecklistId: {
      type: Types.ObjectId,
      ref: "DailyTaskChecklist",
      default: null,
    },
    status: {
      type: String,
      enum: ["green", "yellow", "wilted"],
      default: "green",
    },
    dayNumber: { type: Number, min: 1, required: true },
    needRecovery: { type: Boolean, default: false },
    createdDate: { type: Date, required: true },
    statusChangedDate: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

treeLeafSchema.index({ treeTrackerId: 1, dayNumber: 1 }, { unique: true });

const TreeLeaf =
  mongoose.models.TreeLeaf ||
  mongoose.model("TreeLeaf", treeLeafSchema, "treeLeaves");

export default TreeLeaf;
