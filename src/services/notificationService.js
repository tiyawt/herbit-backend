// src/services/notificationService.js
import notification from "../models/notification.js";
import { isSameDay } from "../utils/date.js";

const TITLES = {
  daily_task: "Daily Challenge Hari Ini",
  ecoenzym_project: "Pengingat Progres Ecoenzym",
  game_sorting: "Ayo Main Game Sorting!",
  voucher: "Voucher Hampir Kadaluarsa",
};

export async function pushDailyTaskNotif(userId, date = new Date()) {
  const dayBucket = date.toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    return await notification.create({
      user_id: userId,
      type: "daily_task",
      title: TITLES.daily_task,
      message:
        "Ada 5 aksi kecil menunggu kamu. Yuk checklist biar pohonmu makin rimbun!",
      day_bucket: dayBucket,
    });
  } catch (e) {
    if (e.code === 11000) return null; // sudah ada untuk hari ini
    throw e;
  }
}

export async function pushEcoenzymProgressNotif(userId, projectId, dayNumber) {
  try {
    return await notification.create({
      user_id: userId,
      type: "ecoenzym_project",
      title: TITLES.ecoenzym_project,
      message: `Hari ke-${dayNumber}! Yuk upload foto progressmu 📸`,
      reference_id: projectId,
    });
  } catch (e) {
    if (e.code === 11000) return null;
    throw e;
  }
}

export async function pushGameSortingInvite(userId, gameSessionId) {
  try {
    return await notification.create({
      user_id: userId,
      type: "game_sorting",
      title: TITLES.game_sorting,
      message: "Pilah sampah dengan benar dan dapatkan poin 🌍💚",
      reference_id: gameSessionId, // bisa null kalau sifatnya broadcast; pakai null = boleh banyak
    });
  } catch (e) {
    if (e.code === 11000) return null;
    throw e;
  }
}

export async function pushVoucherExpiring(userId, voucherId) {
  try {
    return await notification.create({
      user_id: userId,
      type: "voucher",
      title: TITLES.voucher,
      message:
        "Voucher kamu akan expired besok 🎟️, segera tukarkan sebelum hilang!",
      reference_id: voucherId,
    });
  } catch (e) {
    if (e.code === 11000) return null;
    throw e;
  }
}

// Query helper
export async function listUserNotifications(
  userId,
  { unreadOnly = false } = {}
) {
  const q = { user_id: userId };
  if (unreadOnly) q.is_read = false;
  return notification.find(q).sort({ createdAt: -1 });
}

export async function markRead(notificationId) {
  return notification.findByIdAndUpdate(
    notificationId,
    { is_read: true },
    { new: true }
  );
}

export async function markAllRead(userId, type) {
  const q = { user_id: userId };
  if (type) q.type = type;
  await notification.updateMany(q, { $set: { is_read: true } });
  return { ok: true };
}
