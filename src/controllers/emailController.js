// src/controllers/emailController.js
import { isEmail } from "../utils/validators.js";
import { ok, fail } from "../utils/response.js";
import {
  isEmailTaken,
  updateEmailForUser,
} from "../services/accountService.js";

export async function updateEmailHandler(req, res) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return fail(res, "UNAUTHORIZED", "User harus login", 401);
    }

    const rawEmail = req.body?.email;
    if (rawEmail === undefined || rawEmail === null || rawEmail === "") {
      return fail(res, "VALIDATION_ERROR", "Email wajib diisi", 422);
    }

    const normalizedEmail = String(rawEmail).trim().toLowerCase();

    if (!isEmail(normalizedEmail)) {
      return fail(
        res,
        "VALIDATION_ERROR",
        "Format email tidak valid",
        422
      );
    }

    const emailTaken = await isEmailTaken(normalizedEmail, authUserId);
    if (emailTaken) {
      return fail(
        res,
        "EMAIL_TAKEN",
        "Email sudah digunakan",
        409
      );
    }

    const updatedUser = await updateEmailForUser(authUserId, normalizedEmail);

    if (!updatedUser) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    return ok(
      res,
      {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          username: updatedUser.username,
          photoUrl: updatedUser.photoUrl,
          totalPoints: updatedUser.totalPoints,
          prePoints: updatedUser.prePoints,
          sortingStreak: updatedUser.sortingStreak,
          sortingBestStreak: updatedUser.sortingBestStreak,
          sortingLastPlayedBucket: updatedUser.sortingLastPlayedBucket,
          updatedAt: updatedUser.updatedAt,
        },
      },
      "Email berhasil diperbarui"
    );
  } catch (error) {
    return fail(
      res,
      "UPDATE_EMAIL_FAILED",
      "Gagal memperbarui email",
      500
    );
  }
}
