import mongoose from "mongoose";

const gameSortingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    playedDate: { type: Date, required: true },
    dayBucket: { type: String, required: true, index: true },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

gameSortingSchema.index({ userId: 1, dayBucket: 1 });

export default mongoose.model("GameSorting", gameSortingSchema, "gameSortings");
