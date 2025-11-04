import { ok, fail } from "../utils/response.js";
import { registerUser, loginUser, me } from "../services/authService.js";
import { createTreeTrackerForUser } from "./treeTrackersController.js";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
  path: "/",
};

export async function register(req, res) {
  try {
    const { email, username, phone_number, password } = req.body;
    const result = await registerUser({
      email,
      username,
      phone_number,
      password,
    });
    return ok(res, { user: result.user ?? result }, "Registered", 201);
  } catch (e) {
    if (e.message === "EMAIL_OR_USERNAME_TAKEN") {
      return fail(res, e.message, "Email atau username sudah dipakai", 409);
    }
    return fail(res, "REGISTER_ERROR", e.message, 400);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    // Simpan token ke cookie (httpOnly)
    res.cookie("access_token", result.token, cookieOpts);

    return ok(res, { user: result.user }, "Logged in");
  } catch (e) {
    if (e.message === "INVALID_CREDENTIALS") {
      return fail(res, e.message, "Email atau password salah", 401);
    }
    return fail(res, "LOGIN_ERROR", e.message, 400);
  }
}

export async function getMe(req, res) {
  try {
    const userData = await me(req.user.id);
    return ok(res, userData);
  } catch (e) {
    if (e.message === "User not found") {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }
    return fail(res, "ME_ERROR", e.message, 400);
  }
}

export async function logout(req, res) {
  res.clearCookie("access_token", { path: "/" });
  return ok(res, null, "Logged out");
}
