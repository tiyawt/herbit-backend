import {
  listMilestoneClaims,
  getMilestoneClaimById,
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

export async function listMilestoneClaimsAdminHandler(req, res) {
  try {
    const { userId, rewardId, status, limit, page } = req.query;
    const claims = await listMilestoneClaims({
      userId,
      rewardId,
      status,
      limit,
      page,
    });
    return ok(res, claims);
  } catch (error) {
    return respondError(res, error, "Gagal memuat daftar milestone claim");
  }
}

export async function getMilestoneClaimAdminHandler(req, res) {
  try {
    const { claimId } = req.params;
    const claim = await getMilestoneClaimById(claimId);
    return ok(res, claim);
  } catch (error) {
    return respondError(res, error, "Gagal mengambil detail milestone claim", 404);
  }
}
