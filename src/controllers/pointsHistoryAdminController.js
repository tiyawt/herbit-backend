import {
  getUserPointsHistory,
  searchPointsHistory,
} from "../services/pointsHistoryService.js";
import { ok } from "../utils/response.js";

function respondError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0 ? error.status : status;
  return res.status(httpStatus).json({
    success: false,
    message,
  });
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes"].includes(normalized);
  }
  return false;
}

function parseArrayParam(value) {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .join(",")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function listPointsHistoryAdminHandler(req, res) {
  try {
    const {
      userId,
      source,
      sources,
      from,
      to,
      minPoints,
      maxPoints,
      type,
      limit,
      page,
      includeUser,
    } = req.query;

    const sourceTokens = parseArrayParam(sources);
    sourceTokens.push(...parseArrayParam(source));

    const history = await searchPointsHistory({
      userId:
        typeof userId === "string" && userId.trim().length > 0
          ? userId.trim()
          : null,
      sources: sourceTokens,
      from,
      to,
      minPoints,
      maxPoints,
      direction:
        typeof type === "string" && type.trim().length > 0
          ? type.trim().toLowerCase()
          : null,
      withUser: parseBoolean(includeUser),
      limit,
      page,
    });

    return ok(res, history);
  } catch (error) {
    return respondError(res, error, "Gagal memuat riwayat poin");
  }
}

export async function getUserPointsHistoryAdminHandler(req, res) {
  try {
    const { userId } = req.params;
    const { limit, page } = req.query;

    if (!userId) {
      return respondError(
        res,
        new Error("USER_ID_REQUIRED"),
        "userId wajib diisi",
        400
      );
    }

    const history = await getUserPointsHistory(userId, { limit, page });
    return ok(res, history);
  } catch (error) {
    return respondError(res, error, "Gagal memuat riwayat poin pengguna");
  }
}
