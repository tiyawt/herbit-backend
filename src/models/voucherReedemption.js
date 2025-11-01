// src/models/voucherRedemption.js
import mongoose from "mongoose";

const voucherRedemptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      required: false,
      index: true,
    },
    code: { type: String, required: true },
    pointsDeducted: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model(
  "VoucherRedemption",
  voucherRedemptionSchema,
  "voucherRedemptions"
);
