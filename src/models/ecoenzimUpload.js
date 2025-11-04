import mongoose from "mongoose";

const ecoenzimUploadSchema = new mongoose.Schema(
  {
    ecoenzimProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "ecoenzimProject", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    monthNumber: { type: Number, required: false, default: null },
    photoUrl: { type: String, required: false, default: null },
    uploadedDate: { type: Date, default: Date.now },
    prePointsEarned: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.models.ecoenzimUpload || mongoose.model("ecoenzimUpload", ecoenzimUploadSchema);
