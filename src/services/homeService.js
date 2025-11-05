import EcoenzimProject from "../models/ecoenzimProject.js";
import EcoenzimUpload from "../models/ecoenzimUpload.js";
import User from "../models/user.js";
import { listVouchers } from "./voucherService.js";
import { getTodayChecklistForUser } from "./dailyTaskChecklistService.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TARGET_CHECKINS = 90;

async function buildHabitsToday(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const { tasks, date } = await getTodayChecklistForUser(userId);
    const habits = tasks.map((task) => ({
      title: task.title,
      category: task.category,
      icon: task.symbol ?? null,
      done: Boolean(task.isCompleted),
    }));

    const total = habits.length;
    const completed = habits.filter((habit) => habit.done).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    // Gunakan tanggal dari checklist (format YYYY-MM-DD) dan ubah ke ISO
    let isoDate = today.toISOString();
    if (date) {
      const parsed = new Date(`${date}T00:00:00.000+07:00`);
      if (!Number.isNaN(parsed.getTime())) {
        isoDate = parsed.toISOString();
      }
    }

    return {
      habits,
      total,
      completed,
      percent,
      date: isoDate,
    };
  } catch (error) {
    if (error?.message === "NO_DAILY_TASKS_AVAILABLE" || error?.status === 404) {
      return {
        habits: [],
        total: 0,
        completed: 0,
        percent: 0,
        date: today.toISOString(),
      };
    }
    throw error;
  }
}

async function buildEcoenzymSummary(userId) {
  const normalizedId = userId?.toString?.() ?? userId;
  const userIdFilter = [
    normalizedId,
    ...(userId && typeof userId !== "string" ? [userId] : []),
  ];

  const [project, allProjects] = await Promise.all([
    EcoenzimProject.findOne({
      userId: { $in: userIdFilter },
      status: "ongoing",
    })
      .sort({ createdAt: -1 })
      .lean(),
    EcoenzimProject.find({ userId: { $in: userIdFilter } })
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  if (!project) return null;

  const now = new Date();
  const start = project.startDate ? new Date(project.startDate) : now;
  const end = project.endDate ? new Date(project.endDate) : now;

  const totalDays = Math.max(
    Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY),
    0
  );
  const elapsedDaysRaw = (now.getTime() - start.getTime()) / MS_PER_DAY;
  const elapsedDays = Math.max(Math.floor(elapsedDaysRaw), 0);
  const consumedDays = now >= start ? Math.min(elapsedDays + 1, totalDays) : 0;
  const daysRemaining = Math.max(totalDays - consumedDays, 0);

  const projectIdValue =
    project.id ?? project._id?.toString?.() ?? project._id ?? null;
  const projectId =
    projectIdValue === null || projectIdValue === undefined
      ? null
      : projectIdValue.toString();
  let monthNumber = 0;
  let totalCheckins = 0;
  if (projectId) {
    const [latestVerifiedUpload, checkinCount] = await Promise.all([
      EcoenzimUpload.findOne({
        ecoenzimProjectId: projectId,
        status: "verified",
        monthNumber: { $ne: null },
      })
        .sort({ monthNumber: -1, uploadedDate: -1 })
        .lean(),
      EcoenzimUpload.countDocuments({
        ecoenzimProjectId: projectId,
        status: "verified",
        monthNumber: null,
      }),
    ]);
    monthNumber = latestVerifiedUpload?.monthNumber ?? 0;
    totalCheckins = checkinCount;
  }

  const progressPercent = Math.min(
    100,
    Math.round(
      (Math.min(totalCheckins, TARGET_CHECKINS) / TARGET_CHECKINS) * 100
    )
  );

  const indexInHistory = allProjects.findIndex((item) => {
    const itemIdValue = item.id ?? item._id?.toString?.() ?? item._id ?? null;
    const itemId =
      itemIdValue === null || itemIdValue === undefined
        ? null
        : itemIdValue.toString();
    if (!itemId || !projectId) return false;
    return itemId === projectId;
  });
  const batchNumber = indexInHistory >= 0 ? indexInHistory + 1 : 1;
  return {
    projectId,
    status: project.status,
    progress: progressPercent,
    monthNumber,
    daysRemaining,
    batchNumber,
    info: { daysRemaining },
  };
}

async function buildVoucherBanners() {
  try {
    const response = await listVouchers({
      status: "active",
    });
    const items = response.items ?? [];
    return items.map((item) => ({
      name: item.name,
      image: item.bannerUrl,
      href: item.landingUrl,
    }));
  } catch {
    return [];
  }
}

export async function getHomeSummary(username) {
  const user = await User.findOne({ username })
    .select({
      username: 1,
      email: 1,
      photoUrl: 1,
      totalPoints: 1,
    })
    .lean();

  if (!user || !user._id) {
    const error = new Error("USER_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const userId = user._id;

  const [habitSummary, ecoenzym, rewardsBanners] = await Promise.all([
    buildHabitsToday(userId),
    buildEcoenzymSummary(userId),
    buildVoucherBanners(),
  ]);

  return {
    user: {
      username: user.username,
      photoUrl: user.photoUrl,
      totalPoints: user.totalPoints,
    },
    progress: {
      date: habitSummary.date,
      total: habitSummary.total,
      completed: habitSummary.completed,
      percent: habitSummary.percent,
    },
    ecoenzym,
    rewardsBanners,
    habitsToday: habitSummary.habits,
  };
}
