import Reward from "../models/reward.js";
import MilestoneClaim from "../models/milestoneClaim.js";
import User from "../models/user.js";
import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import { recordPointsChange } from "./pointsHistoryService.js";

const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 };

function normalizeCode(code) {
  if (!code) return null;
  return String(code).trim();
}

function mapReward(reward) {
  if (!reward) return null;
  return {
    id: reward._id?.toString() ?? null,
    code: reward.code,
    name: reward.name,
    description: reward.description,
    pointsReward: reward.pointsReward,
    targetDays: reward.targetDays,
    isActive: reward.isActive,
    image: reward.image ?? null,
    createdAt: reward.createdAt,
    updatedAt: reward.updatedAt,
  };
}

function mapMilestoneClaim(claim, reward) {
  if (!claim) return null;
  const rewardDoc = reward ?? claim.rewardId;
  const hasRewardDetails =
    rewardDoc && typeof rewardDoc === "object" && ("code" in rewardDoc || "name" in rewardDoc);
  return {
    id: claim._id?.toString() ?? null,
    userId:
      claim.userId &&
      typeof claim.userId === "object" &&
      "toString" in claim.userId
        ? claim.userId.toString()
        : claim.userId?.toString() ?? null,
    rewardId:
      claim.rewardId &&
      typeof claim.rewardId === "object" &&
      "toString" in claim.rewardId
        ? claim.rewardId.toString()
        : claim.rewardId?._id?.toString() ?? null,
    code: claim.code,
    progressDays: claim.progressDays ?? 0,
    pointsAwarded: claim.pointsAwarded ?? 0,
    status: claim.status,
    claimedAt: claim.claimedAt ?? null,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    reward: hasRewardDetails ? mapReward(rewardDoc) : null,
  };
}

function getPagination(limit, page) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  return { safeLimit, safePage, skip };
}

export async function listRewards({
  isActive = true,
  search = null,
  limit = 20,
  page = 1,
} = {}) {
  const filter = {};
  if (typeof isActive === "boolean") {
    filter.isActive = isActive;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const [items, total] = await Promise.all([
    Reward.find(filter).sort({ targetDays: 1 }).skip(skip).limit(safeLimit),
    Reward.countDocuments(filter),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map(mapReward),
  };
}

export async function getReward(rewardId) {
  const reward = await Reward.findById(rewardId);
  if (!reward) {
    const error = new Error("REWARD_NOT_FOUND");
    error.status = 404;
    throw error;
  }
  return mapReward(reward);
}

export async function createReward(payload = {}) {
  const normalizedCode = normalizeCode(payload.code);
  if (!normalizedCode) {
    const error = new Error("REWARD_CODE_REQUIRED");
    error.status = 400;
    throw error;
  }

  const exists = await Reward.exists({ code: normalizedCode }).collation(
    CASE_INSENSITIVE_COLLATION
  );
  if (exists) {
    const error = new Error("REWARD_CODE_EXISTS");
    error.status = 409;
    throw error;
  }

  const reward = new Reward({
    code: normalizedCode,
    name: payload.name,
    description: payload.description,
    pointsReward: payload.pointsReward,
    targetDays: payload.targetDays,
    isActive: payload.isActive,
    image: payload.image,
  });

  const saved = await reward.save();
  return mapReward(saved);
}

export async function updateReward(rewardId, updates = {}) {
  const reward = await Reward.findById(rewardId);
  if (!reward) {
    const error = new Error("REWARD_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "code")) {
    const normalizedCode = normalizeCode(updates.code);
    if (!normalizedCode) {
      const error = new Error("REWARD_CODE_REQUIRED");
      error.status = 400;
      throw error;
    }
    if (normalizedCode !== reward.code) {
      const exists = await Reward.exists({
        code: normalizedCode,
        _id: { $ne: rewardId },
      }).collation(CASE_INSENSITIVE_COLLATION);
      if (exists) {
        const error = new Error("REWARD_CODE_EXISTS");
        error.status = 409;
        throw error;
      }
      reward.code = normalizedCode;
    }
  }

  const fields = [
    "name",
    "description",
    "pointsReward",
    "targetDays",
    "isActive",
    "image",
  ];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      reward[field] = updates[field];
    }
  });

  const saved = await reward.save();
  return mapReward(saved);
}

export async function deleteReward(rewardId) {
  const removed = await Reward.findByIdAndDelete(rewardId);
  if (!removed) {
    const error = new Error("REWARD_NOT_FOUND");
    error.status = 404;
    throw error;
  }
  return { id: removed._id?.toString() ?? null };
}

function computeStreakDays(timestamps = []) {
  if (!timestamps.length) return 0;
  const daySet = new Set();
  timestamps.forEach((ts) => {
    if (!ts) return;
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return;
    date.setHours(0, 0, 0, 0);
    daySet.add(date.getTime());
  });
  if (!daySet.size) return 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today.getTime();
  while (daySet.has(cursor)) {
    streak += 1;
    cursor -= ONE_DAY;
  }
  return streak;
}

export async function claimRewardMilestone({
  userId,
  rewardCode,
}) {
  const normalizedCode = normalizeCode(rewardCode);
  if (!normalizedCode) {
    const error = new Error("REWARD_CODE_REQUIRED");
    error.status = 400;
    throw error;
  }

  const reward = await Reward.findOne({ code: normalizedCode })
    .collation(CASE_INSENSITIVE_COLLATION)
    .exec();
  if (!reward) {
    const error = new Error("REWARD_NOT_FOUND");
    error.status = 404;
    throw error;
  }
  if (!reward.isActive) {
    const error = new Error("REWARD_INACTIVE");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId).exec();
  if (!user) {
    const error = new Error("USER_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const existingClaim = await MilestoneClaim.findOne({
    userId,
    rewardId: reward._id,
  }).exec();

  if ((existingClaim?.pointsAwarded ?? 0) > 0) {
    const error = new Error("REWARD_ALREADY_CLAIMED");
    error.status = 409;
    throw error;
  }

  const checklistDocs = await DailyTaskChecklist.find({
    userId,
    isCompleted: true,
  })
    .select({ completedAt: 1, updatedAt: 1, createdAt: 1 })
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(120)
    .lean();

  const timestamps = checklistDocs.map(
    (item) =>
      item.completedAt ?? item.updatedAt ?? item.createdAt ?? null
  );
  const streakDays = computeStreakDays(timestamps);

  if (streakDays < reward.targetDays) {
    const error = new Error("REWARD_PROGRESS_INSUFFICIENT");
    error.status = 409;
    throw error;
  }

  let claim = existingClaim;
  let claimChanged = false;

  if (!claim) {
    claim = await MilestoneClaim.create({
      userId,
      rewardId: reward._id,
      code: reward.code,
      progressDays: streakDays,
      status: "completed",
    });
  } else {
    if (claim.progressDays !== streakDays) {
      claim.progressDays = streakDays;
      claimChanged = true;
    }
    if (claim.status !== "completed") {
      claim.status = "completed";
      claimChanged = true;
    }
  }

  const meetsTarget = streakDays >= reward.targetDays;
  let awardedNow = 0;

  if (meetsTarget && (claim.pointsAwarded ?? 0) === 0) {
    claim.pointsAwarded = reward.pointsReward;
    claim.status = "completed";
    claim.claimedAt = new Date();
    claimChanged = true;

    user.totalPoints = (user.totalPoints ?? 0) + reward.pointsReward;
    await user.save();

    await recordPointsChange({
      userId: user._id,
      pointsAmount: reward.pointsReward,
      source: "reward",
      referenceId: reward.code,
      createdAt: claim.claimedAt,
    });

    awardedNow = reward.pointsReward;
  }

  if (claimChanged && claim.save) {
    await claim.save();
  }

  return {
    reward: mapReward(reward),
    claim: mapMilestoneClaim(claim, reward),
    pointsAwarded: awardedNow,
  };
}

export async function getUserMilestoneClaims(
  userId,
  { limit = 20, page = 1 } = {}
) {
  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const [items, total] = await Promise.all([
    MilestoneClaim.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("rewardId"),
    MilestoneClaim.countDocuments({ userId }),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map((claim) => mapMilestoneClaim(claim, claim.rewardId)),
  };
}

export async function updateMilestoneProgress({
  userId,
  rewardCode,
  progressDays,
}) {
  const normalizedCode = normalizeCode(rewardCode);
  if (!normalizedCode) {
    const error = new Error("REWARD_CODE_REQUIRED");
    error.status = 400;
    throw error;
  }

  const reward = await Reward.findOne({ code: normalizedCode })
    .collation(CASE_INSENSITIVE_COLLATION)
    .lean();
  if (!reward) {
    const error = new Error("REWARD_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const safeProgress = Math.max(Number(progressDays) || 0, 0);
  const claim = await MilestoneClaim.findOneAndUpdate(
    { userId, rewardId: reward._id },
    {
      $set: {
        code: reward.code,
        progressDays: safeProgress,
        status: safeProgress >= reward.targetDays ? "completed" : "pending",
      },
      $unset: { pointsAwarded: "" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return mapMilestoneClaim(claim, reward);
}
