import express from "express";
import { getWeeklyProgress } from "../controllers/weeklyProgressController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/weekly", authRequired, getWeeklyProgress);

export default router;
