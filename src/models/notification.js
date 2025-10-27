// src/models/notification.js
import mongoose from "mongoose";

export const NOTIF_TYPES = [
  "daily_task",
  "ecoenzym_project",
  "game_sorting",
  "voucher",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIF_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ID sumber (task/project/game/voucher)
    isRead: { type: Boolean, default: false },
    scheduledFor: { type: Date, default: null },
    dayBucket: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Cegah duplikat untuk kombinasi (user, type, reference) — buat ecoenzym & voucher
notificationSchema.index(
  { userId: 1, type: 1, referenceId: 1, dayBucket: 1 },
  {
    name: "notif_unique_ref",
    unique: true,
    partialFilterExpression: {
      referenceId: { $type: "objectId" },
      dayBucket: { $type: "string" },
    },
  }
);

// Daily Task — hanya 1 notifikasi per hari
notificationSchema.index(
  { userId: 1, type: 1, dayBucket: 1 },
  {
    name: "notif_daily_task_per_day",
    unique: true,
    partialFilterExpression: {
      dayBucket: { $type: "string" },
      type: "daily_task",
    },
  }
);

// Game Sorting — hanya 1 notifikasi per hari
notificationSchema.index(
  { userId: 1, type: 1, dayBucket: 1 },
  {
    name: "notif_game_sorting_per_day",
    unique: true,
    partialFilterExpression: {
      dayBucket: { $type: "string" },
      type: "game_sorting",
    },
  }
);

export default mongoose.model("Notification", notificationSchema);
