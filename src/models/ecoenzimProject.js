import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organicWasteWeight: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["ongoing", "cancelled", "completed"], default: "ongoing" },
  prePointsEarned: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  canClaim: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("ecoenzimProject", projectSchema);