import mongoose from "mongoose";

const gameSortingRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gameSortingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSorting",
      default: null,
    },

    dayBucket: {
      type: String,
      required: true,
      index: true,
    },

    pointAwarded: {
      type: Number,
      default: 0,
    },

    claimedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

gameSortingRewardSchema.index({ userId: 1, dayBucket: 1 }, { unique: true });

export default mongoose.model(
  "GameSortingReward",
  gameSortingRewardSchema,
  "gameSortingRewards"
);
