import mongoose from "mongoose";

const ecoenzimUploadProgressSchema = new mongoose.Schema(
  {
    ecoenzimProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "ecoenzimProject", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    monthNumber: { type: Number, required: true },
    photoUrl: { type: String, required: true },
    uploadedDate: { type: Date, required: true },
    prePointsEarned: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("ecoenzimUploadProgress", ecoenzimUploadProgressSchema);
