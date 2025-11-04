import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const milestoneClaimSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rewardId: {
      type: Types.ObjectId,
      ref: "Reward",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    progressDays: { type: Number, default: 0, min: 0 },
    pointsAwarded: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },
    claimedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

milestoneClaimSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

const MilestoneClaim =
  mongoose.models.MilestoneClaim ||
  mongoose.model(
    "MilestoneClaim",
    milestoneClaimSchema,
    "milestoneClaims"
  );

export default MilestoneClaim;
