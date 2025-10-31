import mongoose from "mongoose";

const ecoenzimUploadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ecoenzimProjectId: { type: String, required: true },
    userId: { type: String, required: true },
    monthNumber: { type: Number, required: true },
    photoUrl: { type: String, required: true },
    uploadedDate: { type: Date, required: true },
    prePointsEarned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const ecoenzimUpload = mongoose.model(
  "EcoenzimUpload",
  ecoenzimUploadSchema,
  "ecoenzimUploads"
);
export default ecoenzimUpload;
