import mongoose from "mongoose";

const { Schema } = mongoose;

const rewardSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    pointsReward: { type: Number, required: true, min: 0 },
    targetDays: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

rewardSchema.index({ isActive: 1, targetDays: 1 });

const Reward =
  mongoose.models.Reward ||
  mongoose.model("Reward", rewardSchema, "rewards");

export default Reward;
