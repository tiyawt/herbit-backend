import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const pointsHistorySchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pointsAmount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["reward", "voucher", "ecoenzym", "game"],
      required: true,
    },
    referenceId: { type: String, default: null, trim: true },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: false,
    },
  }
);

pointsHistorySchema.index({ userId: 1, createdAt: -1 });

const PointsHistory =
  mongoose.models.PointsHistory ||
  mongoose.model("PointsHistory", pointsHistorySchema, "pointsHistory");

export default PointsHistory;
