import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const voucherRedemptionSchema = new Schema(
  {
    voucherId: {
      type: Types.ObjectId,
      ref: "Voucher",
      required: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pointsDeducted: { type: Number, required: true, min: 0 },
    code: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["unused", "used", "cancelled"],
      default: "unused",
    },
    redeemedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

voucherRedemptionSchema.index({ userId: 1, redeemedAt: -1 });

const VoucherRedemption =
  mongoose.models.VoucherRedemption ||
  mongoose.model(
    "VoucherRedemption",
    voucherRedemptionSchema,
    "voucherRedemptions"
  );

export default VoucherRedemption;
