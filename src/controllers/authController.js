import { ok, fail } from "../utils/response.js";
import { registerUser, loginUser, me } from "../services/authService.js";

export async function register(req, res) {
  try {
    const { email, username, phone_number, password } = req.body;
    const result = await registerUser({ email, username, phone_number, password });
    return ok(res, result, "Registered", 201);
  } catch (e) {
    if (e.message === "EMAIL_OR_USERNAME_TAKEN")
      return fail(res, e.message, "Email atau username sudah dipakai", 409);
    return fail(res, "REGISTER_ERROR", e.message, 400);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    return ok(res, result, "Logged in");
  } catch (e) {
    if (e.message === "INVALID_CREDENTIALS")
      return fail(res, e.message, "Email atau password salah", 401);
    return fail(res, "LOGIN_ERROR", e.message, 400);
  }
}

export async function getMe(req, res) {
  try {
    const data = await me(req.user.id);
    return ok(res, data);
  } catch (e) {
    return fail(res, "ME_ERROR", e.message, 400);
  }
}
