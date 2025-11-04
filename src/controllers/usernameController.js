// src/controllers/usernameController.js
import jwt from "jsonwebtoken";
import {
  normalizeUsername,
  UsernameValidationError,
} from "../utils/usernameUtils.js";
import {
  generateUsernameSuggestions,
  isUsernameTaken,
  updateUsernameForUser,
} from "../services/usernameService.js";
import { ok, fail } from "../utils/response.js";

export async function checkUsernameAvailabilityHandler(req, res) {
  try {
    const rawUsername = req.query?.username ?? "";
    if (!rawUsername) {
      return res.status(200).json({
        available: false,
        message: "Parameter username diperlukan",
      });
    }

    let username;
    try {
      username = normalizeUsername(rawUsername, { requireAt: true });
    } catch (error) {
      if (error instanceof UsernameValidationError) {
        return res.status(200).json({
          available: false,
          message: error.message,
        });
      }
      throw error;
    }

    let excludeUserId = req.user?.id ?? null;
    if (!excludeUserId) {
      const header = req.headers.authorization || "";
      const tokenHeader = header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : null;
      const tokenCookie = req.cookies?.access_token || null;
      const token = tokenHeader || tokenCookie;
      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          excludeUserId = payload?.id ?? null;
        } catch (error) {
          excludeUserId = null;
        }
      }
    }

    const taken = await isUsernameTaken(username, excludeUserId);

    if (taken) {
      return res.status(200).json({
        available: false,
        message: "Username sudah dipakai",
      });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    return res.status(500).json({
      available: false,
      message: "Terjadi kesalahan. Silakan coba lagi.",
    });
  }
}

export async function updateUsernameHandler(req, res) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return fail(res, "UNAUTHORIZED", "User harus login", 401);
    }

    const rawUsername = req.body?.username;
    if (rawUsername === undefined) {
      return fail(
        res,
        "VALIDATION_ERROR",
        "Field username wajib diisi",
        422
      );
    }

    let username;
    try {
      username = normalizeUsername(rawUsername, { requireAt: true });
    } catch (error) {
      if (error instanceof UsernameValidationError) {
        return fail(res, "VALIDATION_ERROR", error.message, 422);
      }
      throw error;
    }

    const taken = await isUsernameTaken(username, authUserId);
    if (taken) {
      return fail(
        res,
        "USERNAME_TAKEN",
        "Username sudah dipakai, silakan pilih yang lain",
        409
      );
    }

    const updatedUser = await updateUsernameForUser(authUserId, username);

    if (!updatedUser) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    return ok(
      res,
      {
        user: {
          id: updatedUser._id,
          username: `@${updatedUser.username}`,
          email: updatedUser.email,
          photoUrl: updatedUser.photoUrl,
          totalPoints: updatedUser.totalPoints,
          prePoints: updatedUser.prePoints,
          sortingStreak: updatedUser.sortingStreak,
          sortingBestStreak: updatedUser.sortingBestStreak,
          sortingLastPlayedBucket: updatedUser.sortingLastPlayedBucket,
          updatedAt: updatedUser.updatedAt,
        },
      },
      "Username berhasil diperbarui"
    );
  } catch (error) {
    return fail(
      res,
      "UPDATE_USERNAME_FAILED",
      "Gagal memperbarui username",
      500
    );
  }
}

export async function getUsernameSuggestionsHandler(req, res) {
  try {
    let base = "";
    try {
      base = normalizeUsername(req.query?.seed ?? "", {
        requireAt: false,
        allowEmpty: true,
      });
    } catch (error) {
      if (error instanceof UsernameValidationError) {
        base = "";
      } else {
        throw error;
      }
    }

    const suggestions = await generateUsernameSuggestions(base);
    return res.status(200).json(suggestions);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Tidak dapat membuat saran username saat ini" });
  }
}
