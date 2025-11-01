import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const dailyTaskChecklistSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dailyTaskId: {
      type: Types.ObjectId,
      ref: "DailyTask",
      required: true,
      index: true,
    },
    treeLeafId: {
      type: Types.ObjectId,
      ref: "TreeLeaf",
      default: null,
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

dailyTaskChecklistSchema.index({ userId: 1, dailyTaskId: 1 }, { unique: true });

const DailyTaskChecklist =
  mongoose.models.DailyTaskChecklist ||
  mongoose.model(
    "DailyTaskChecklist",
    dailyTaskChecklistSchema,
    "dailyTaskChecklist"
  );

export default DailyTaskChecklist;
