// src/models/Notification.js
import mongoose from "mongoose";

export const NOTIF_TYPES = [
  "daily_task",
  "ecoenzym_project",
  "game_sorting",
  "voucher",
];

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIF_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    reference_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // ID sumber (task/project/game/voucher)
    is_read: { type: Boolean, default: false },
    scheduled_for: { type: Date, default: null }, // kalau perlu jadwalkan tampilnya
    // bucket_harian buat cegah duplikat notifikasi harian (daily_task)
    day_bucket: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Cegah duplikat untuk kombinasi (user, type, reference) — buat game/voucher/ecoenzym
notificationSchema.index(
  { user_id: 1, type: 1, reference_id: 1 },
  {
    unique: true,
    partialFilterExpression: { reference_id: { $type: "objectId" } },
  }
);

// Khusus daily_task: cegah >1 notifikasi per hari per user
notificationSchema.index(
  { user_id: 1, type: 1, day_bucket: 1 },
  {
    unique: true,
    partialFilterExpression: {
      day_bucket: { $type: "string" },
      type: "daily_task",
    },
  }
);

export default mongoose.model("Notification", notificationSchema);
