import User from "../models/user.js";
import { getUserPointsHistory } from "../services/pointsHistoryService.js";
import {
  getUserMilestoneClaims,
  updateMilestoneProgress,
} from "../services/rewardService.js";
import { getUserProfileSummary } from "../services/profileService.js";
import { getHomeSummary } from "../services/homeService.js";

import { ok, fail } from "../utils/response.js";

export async function getUserByUsernameHandler(req, res) {
  try {
    const { username } = req.params;
    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const user = await User.findOne({ username })
      .select({
        username: 1,
        email: 1,
        photoUrl: 1,
        totalPoints: 1,
        prePoints: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean();

    if (!user) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    return ok(res, {
      user: {
        id: user._id.toString(),
        ...user,
      },
    });
  } catch (error) {
    return fail(res, "USER_FETCH_FAILED", error.message ?? error, 500);
  }
}

export async function getUserPointsHistoryHandler(req, res) {
  try {
    const { username } = req.params;
    const { limit, page } = req.query;

    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const user = await User.findOne({ username }).select({ _id: 1 }).lean();
    if (!user?._id) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const history = await getUserPointsHistory(user._id, { limit, page });
    return ok(res, history);
  } catch (error) {
    return fail(
      res,
      "POINTS_HISTORY_FETCH_FAILED",
      error.message ?? error,
      500
    );
  }
}

export async function getUserMilestonesHandler(req, res) {
  try {
    const { username } = req.params;
    const { limit, page } = req.query;

    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const user = await User.findOne({ username }).select({ _id: 1 }).lean();
    if (!user?._id) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const milestones = await getUserMilestoneClaims(user._id, { limit, page });
    return ok(res, milestones);
  } catch (error) {
    return fail(
      res,
      "USER_MILESTONE_FETCH_FAILED",
      error.message ?? error,
      500
    );
  }
}

export async function getUserProfileSummaryHandler(req, res) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return fail(res, "UNAUTHORIZED", "User harus login", 401);
    }

    const user = await User.findById(authUserId)
      .select({ username: 1 })
      .lean();
    if (!user?.username) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const summary = await getUserProfileSummary(user.username);
    return ok(res, summary);
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND"
        ? 404
        : error.status ??
          (error.message === "UNAUTHORIZED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500);
    return fail(
      res,
      "USER_PROFILE_SUMMARY_FAILED",
      error.message ?? error,
      status
    );
  }
}

export async function getUserPointsActivityHandler(req, res) {
  try {
    const { username } = req.params;
    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const summary = await getUserProfileSummary(username);
    const pointActivities =
      summary.activities
        ?.filter((activity) => {
          if (typeof activity.points === "number") return true;
          if (typeof activity.prePoints === "number") return true;
          return false;
        })
        .map((activity) => ({
          id: activity.id,
          type: activity.type,
          metricLabel: activity.metricLabel ?? null,
          title: activity.title,
          description: activity.description ?? null,
          points:
            typeof activity.points === "number"
              ? activity.points
              : activity.prePoints ?? 0,
          timeLabel: activity.timeLabel ?? null,
          periods: activity.periods ?? ["all"],
        })) ?? [];

    return ok(res, { activities: pointActivities });
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND" ? 404 : error.status ?? 500;
    return fail(
      res,
      "USER_POINTS_ACTIVITY_FAILED",
      error.message ?? error,
      status
    );
  }
}

export async function getMyHomeSummaryHandler(req, res) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return fail(res, "UNAUTHORIZED", "User harus login", 401);
    }

    const user = await User.findById(authUserId).select({ username: 1 }).lean();

    if (!user?.username) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const summary = await getHomeSummary(user.username);
    return ok(res, summary);
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND"
        ? 404
        : error.status ?? (error.message === "UNAUTHORIZED" ? 401 : 500);
    return fail(res, "HOME_SUMMARY_FAILED", error.message ?? error, status);
  }
}

export async function getUserHomeSummaryHandler(req, res) {
  try {
    const { username } = req.params;
    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const summary = await getHomeSummary(username);
    return ok(res, summary);
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND" ? 404 : error.status ?? 500;
    return fail(res, "HOME_SUMMARY_FAILED", error.message ?? error, status);
  }
}

export async function getHomeSummaryHandler(req, res) {
  try {
    const { username } = req.params;
    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }

    const summary = await getHomeSummary(username);
    return ok(res, summary);
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND" ? 404 : error.status ?? 500;
    return fail(res, "HOME_SUMMARY_FAILED", error.message ?? error, status);
  }
}

export async function updateUserMilestoneProgressHandler(req, res) {
  try {
    const { username, rewardCode } = req.params;
    const { progressDays = null } = req.body ?? {};

    if (!username) {
      return fail(res, "USERNAME_REQUIRED", "Username wajib diisi", 400);
    }
    if (!rewardCode) {
      return fail(res, "REWARD_CODE_REQUIRED", "Kode reward wajib diisi", 400);
    }
    if (progressDays === null || Number.isNaN(Number(progressDays))) {
      return fail(
        res,
        "PROGRESS_REQUIRED",
        "progressDays wajib diisi sebagai angka",
        400
      );
    }

    const user = await User.findOne({ username }).select({ _id: 1 }).lean();
    if (!user?._id) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const result = await updateMilestoneProgress({
      userId: user._id,
      rewardCode,
      progressDays: Number(progressDays),
    });

    return ok(
      res,
      result,
      "Progress reward berhasil diperbarui (endpoint sementara)"
    );
  } catch (error) {
    const status =
      error.status ??
      (error.message === "REWARD_NOT_FOUND" ? 404 : 400);
    return fail(
      res,
      "UPDATE_MILESTONE_PROGRESS_FAILED",
      error.message ?? error,
      status
    );
  }
}
