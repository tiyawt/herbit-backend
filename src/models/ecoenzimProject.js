import mongoose from "mongoose";

const ecoenzimProjectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    organicWasteWeight: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["ongoing", "completed", "cancelled"],
      default: "ongoing",
    },
    prePointsEarned: { type: Number, default: 0 },
    canClaim: { type: Boolean, default: false },
    isClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
    points: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const ecoenzimProject = mongoose.model(
  "EcoenzimProject",
  ecoenzimProjectSchema,
  "ecoenzimProjects"
);
export default ecoenzimProject;
