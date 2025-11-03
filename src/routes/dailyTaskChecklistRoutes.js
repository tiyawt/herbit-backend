import express from "express";
import {
  getTodayTasks,
  getChecklistByUser,
  markComplete,
  uncheck,
} from "../controllers/dailyTaskChecklistController.js";
import { authRequired } from "../middleware/authMiddleware.js"; // pastikan auth juga pakai export ESM

const router = express.Router();

// Ambil semua checklist milik user
router.get("/", authRequired, getChecklistByUser);

router.get("/today", authRequired, getTodayTasks);

// Tandai checklist selesai
router.patch("/:id/complete", authRequired, markComplete);

// Batalkan checklist
router.patch("/:id/uncheck", authRequired, uncheck);

export default router;
