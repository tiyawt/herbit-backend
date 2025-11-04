import User from "../models/user.js";
import { getUserProfileSummary } from "../services/profileService.js";
import { getHomeSummary } from "../services/homeService.js";
import { ok, fail } from "../utils/response.js";

function resolveErrorMessage(error, fallbackMessage) {
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
}

function resolveStatus(error, defaultStatus, overrides = {}) {
  if (error && Number.isInteger(error.status) && error.status > 0) {
    return error.status;
  }
  if (error && typeof error.message === "string") {
    const overrideStatus = overrides[error.message];
    if (overrideStatus) {
      return overrideStatus;
    }
  }
  return defaultStatus;
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
    if (!user || !user.username) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const summary = await getUserProfileSummary(user.username);
    return ok(res, summary);
  } catch (error) {
    const status = resolveStatus(error, 500, {
      USER_NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
    });
    const message = resolveErrorMessage(
      error,
      "Gagal memuat ringkasan profil pengguna"
    );
    return fail(res, "USER_PROFILE_SUMMARY_FAILED", message, status);
  }
}

export async function getMyHomeSummaryHandler(req, res) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return fail(res, "UNAUTHORIZED", "User harus login", 401);
    }

    const user = await User.findById(authUserId).select({ username: 1 }).lean();
    if (!user || !user.username) {
      return fail(res, "USER_NOT_FOUND", "Pengguna tidak ditemukan", 404);
    }

    const summary = await getHomeSummary(user.username);
    return ok(res, summary);
  } catch (error) {
    const status = resolveStatus(error, 500, {
      USER_NOT_FOUND: 404,
      UNAUTHORIZED: 401,
    });
    const message = resolveErrorMessage(
      error,
      "Gagal memuat ringkasan beranda pengguna"
    );
    return fail(res, "HOME_SUMMARY_FAILED", message, status);
  }
}
