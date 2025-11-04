import { Router } from "express";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import { requireBody } from "../utils/validators.js";

const router = Router();

router.post("/forgot-password", requireBody(["email"]), forgotPassword);
router.post("/reset-password", requireBody(["token", "new_password"]), resetPassword);

export default router;
