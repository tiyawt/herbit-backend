import {
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  getReward,
} from "../services/rewardService.js";
import { ok } from "../utils/response.js";

function respondError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0
      ? error.status
      : status;
  return res.status(httpStatus).json({
    success: false,
    message,
  });
}

export async function listRewardsAdminHandler(req, res) {
  try {
    const { isActive, search, limit, page } = req.query;
    let activeFilter;
    if (isActive === "true") activeFilter = true;
    else if (isActive === "false") activeFilter = false;

    const rewards = await listRewards({
      isActive: activeFilter ?? null,
      search,
      limit,
      page,
    });
    return ok(res, rewards);
  } catch (error) {
    return respondError(res, error, "Gagal memuat daftar reward");
  }
}

export async function createRewardAdminHandler(req, res) {
  try {
    const reward = await createReward(req.body);
    return ok(res, reward, "Reward berhasil dibuat", 201);
  } catch (error) {
    return respondError(res, error, "Gagal membuat reward");
  }
}

export async function updateRewardAdminHandler(req, res) {
  try {
    const { rewardId } = req.params;
    const reward = await updateReward(rewardId, req.body);
    return ok(res, reward, "Reward berhasil diperbarui");
  } catch (error) {
    return respondError(res, error, "Gagal memperbarui reward");
  }
}

export async function deleteRewardAdminHandler(req, res) {
  try {
    const { rewardId } = req.params;
    const result = await deleteReward(rewardId);
    return ok(res, result, "Reward berhasil dihapus");
  } catch (error) {
    return respondError(res, error, "Gagal menghapus reward");
  }
}

export async function getRewardAdminHandler(req, res) {
  try {
    const { rewardId } = req.params;
    const reward = await getReward(rewardId);
    return ok(res, reward);
  } catch (error) {
    return respondError(res, error, "Gagal mengambil detail reward", 404);
  }
}
