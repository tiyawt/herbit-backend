import { claimRewardMilestone, listRewards } from "../services/rewardService.js";
import { ok, fail } from "../utils/response.js";

const errorMessages = {
  REWARD_NOT_FOUND: "Reward tidak ditemukan",
  REWARD_INACTIVE: "Reward sedang tidak aktif",
  USER_NOT_FOUND: "Pengguna tidak ditemukan",
  INVALID_PROGRESS: "Progress tidak valid",
};

function handleRewardError(res, error, fallbackCode, status = 400) {
  const details = errorMessages[error.message] ?? error.message ?? fallbackCode;
  const httpStatus = error.status ?? status;
  return fail(res, error.message ?? fallbackCode, details, httpStatus);
}

export async function listRewardsHandler(req, res) {
  try {
    const { isActive, search, limit, page } = req.query;
    let activeFilter;
    if (isActive === "true") activeFilter = true;
    else if (isActive === "false") activeFilter = false;

    const rewards = await listRewards({
      isActive: activeFilter,
      search,
      limit,
      page,
    });

    return ok(res, rewards);
  } catch (error) {
    return handleRewardError(res, error, "REWARD_LIST_ERROR");
  }
}

export async function claimRewardHandler(req, res) {
  try {
    const { rewardCode } = req.params;
    const { progressDays } = req.body ?? {};

    if (!rewardCode) {
      return fail(res, "REWARD_CODE_REQUIRED", "Kode reward wajib diisi", 400);
    }
    if (!req.user?.id) {
      return fail(res, "UNAUTHORIZED", "Autentikasi diperlukan", 401);
    }

    const result = await claimRewardMilestone({
      userId: req.user?.id,
      rewardCode,
      progressDays,
    });

    const message =
      result.pointsAwarded > 0
        ? "Reward berhasil diklaim"
        : "Progress reward diperbarui";

    return ok(res, result, message);
  } catch (error) {
    const status =
      error.message === "REWARD_NOT_FOUND" || error.message === "USER_NOT_FOUND"
        ? 404
        : error.status ?? 400;
    return handleRewardError(res, error, "REWARD_CLAIM_ERROR", status);
  }
}
