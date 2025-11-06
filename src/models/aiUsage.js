import mongoose from "mongoose";

const { Schema } = mongoose;

const aiUsageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dayBucket: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

aiUsageSchema.index({ userId: 1, dayBucket: 1 }, { unique: true });

const AiUsage =
  mongoose.models.AiUsage ||
  mongoose.model("AiUsage", aiUsageSchema, "aiUsageLogs");

export default AiUsage;
