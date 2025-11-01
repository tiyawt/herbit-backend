import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

import {
  register,
  login,
  getMe,
  logout,
} from "../controllers/authController.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { requireBody, validateRegister } from "../utils/validators.js";

const router = Router();

// Auth
router.post(
  "/register",
  requireBody(["email", "username", "password", "confirm_password"]),
  validateRegister(),
  register
);
router.post("/login", requireBody(["email", "password"]), login);
router.get("/me", authRequired, getMe);

// logout
router.post("/logout", logout);

// Forgot/Reset Password
router.post("/forgot-password", requireBody(["email"]), forgotPassword);
router.post(
  "/reset-password",
  requireBody(["token", "new_password"]),
  resetPassword
);

//Create admin
router.post("/create-admin", async (req, res) => {
  const { email } = req.body;
  await User.findOneAndUpdate({ email }, { role: "admin" });
  res.json({ success: true });
});

// Google OAuth
router.get(
  "/oauth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/oauth-failed",
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, role: req.user.role || "user" },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );
    const redirect = `${
      process.env.CLIENT_APP_URL || "http://localhost:3000"
    }/oauth-callback?token=${token}`;
    res.redirect(redirect);
  }
);

export default router;
