// src/services/notificationService.js
import notification from "../models/notification.js";

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
  const stages = {
    7: {
      title: "Fermentasi Aktif Dimulai",
      message:
        "Gas banyak, bau mulai asam-manis. Fermentasi sedang aktif, jangan lupa keluarkan gas hari ini",
    },
    14: {
      title: "Aroma Mulai Stabil",
      message:
        "Bau tajam berkurang, warna makin gelap. Fermentasi berjalan sehat",
    },
    21: {
      title: "Mikroba Bekerja Keras",
      message:
        "Endapan mulai terbentuk di dasar wadah. Proses pemecahan zat organik aktif",
    },
    30: {
      title: "Gas Mulai Tenang",
      message:
        "Aktivitas gas menurun, cairan mulai tenang. Burping cukup beberapa hari sekali",
    },
    35: {
      title: "Warna Coklat Pekat",
      message:
        "Cairan berubah jadi coklat keemasan. Bau asam-manis makin lembut",
    },
    42: {
      title: "Fermentasi Tenang",
      message:
        "Sisa bahan mulai terurai. Kamu bisa biarkan wadah tertutup penuh",
    },
    49: {
      title: "Setengah Jalan",
      message: "Cairan makin jernih dan stabil. Fermentasi berjalan baik",
    },
    56: {
      title: "Asam Alami Terbentuk",
      message: "Aroma buah dan tanah mulai terasa. Ecoenzym makin matang",
    },
    60: {
      title: "Fermentasi Stabil",
      message: "Hampir tak ada gas keluar. Warna jernih, endapan halus",
    },
    70: {
      title: "Masa Tenang",
      message: "Biarkan proses alami berlanjut. Jangan buka wadah",
    },
    77: {
      title: "Menjelang Panen",
      message:
        "Cairan makin jernih dan lembut aromanya. Panen sebentar lagi",
    },
    84: {
      title: "Minggu Terakhir",
      message: "Cairan bersih, endapan padat. Siap saring minggu depan",
    },
    90: {
      title: "Panen Ecoenzym!",
      message: "Fermentasi selesai 🎉 Cairan coklat keemasan siap digunakan",
    },
  };

  const stage = stages[dayNumber];
  if (!stage) return null; // skip kalau bukan hari milestone

  try {
    return await notification.create({
      user_id: userId,
      type: "ecoenzym_project",
      title: `Hari ke-${dayNumber} — ${stage.title}`,
      message: stage.message,
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
      message: "Pilah sampah dengan benar dan dapatkan poin",
      reference_id: gameSessionId,
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
