// src/models/ecoenzimProject.js
import mongoose from "mongoose";
import Upload from "./ecoenzimUploadProgress.js"; // dipakai di updateProjectStatus

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organicWasteWeight: { type: Number, required: true, default: 0 },

  // started flags
  started: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  status: { type: String, enum: ["not_started","ongoing", "cancelled", "completed"], default: "not_started" },

  prePointsEarned: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  canClaim: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: null }
}, { timestamps: true });

projectSchema.methods.updateProjectStatus = async function () {
  const now = new Date();
  if (this.started && this.endDate && now >= this.endDate) {
    const verifiedUploads = await Upload.countDocuments({
      ecoenzimProjectId: this._id,
      status: "verified",
      monthNumber: { $in: [1,2,3] }
    });
    this.status = verifiedUploads >= 3 ? "completed" : "cancelled";
    this.canClaim = verifiedUploads >= 3;
    await this.save();
  } else {
    // ensure not_started -> ongoing if started
    if (this.started && this.status === "not_started") {
      this.status = "ongoing";
      await this.save();
    }
  }
};

export default mongoose.models.ecoenzimProject || mongoose.model("ecoenzimProject", projectSchema);
