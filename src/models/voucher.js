import mongoose from "mongoose";

const { Schema } = mongoose;

const voucherSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["eco-action", "health", "learning", "other"],
      default: "other",
      index: true,
    },
    pointsRequired: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: null, min: 0 },
    redeemedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, required: true, default: null },
    validUntil: { type: Date, required: true, default: null },
    imageUrl: { type: String, required: true, default: null },
    bannerUrl: { type: String, required: true, default: null },
    partnerName: { type: String, required: true, default: null, trim: true },
    discountValue: { type: String, required: true, default: null, trim: true },
    landingUrl: { type: String, required: true, default: null, trim: true },
    terms: { type: [String], required: true, default: [] },
    instructions: { type: [String], required: true, default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);
voucherSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const Voucher =
  mongoose.models.Voucher ||
  mongoose.model("Voucher", voucherSchema, "vouchers");

export default Voucher;
