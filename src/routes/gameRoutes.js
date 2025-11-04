// src/routes/gameSortingRoutes.js
import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  startGameSession,
  completeGameSession,
  claimGameReward,
} from "../services/gameSortingService.js";
import gameSortingReward from "../models/gameSortingReward.js";

const router = Router();

router.post("/start", authRequired, async (req, res, next) => {
  try {
    const session = await startGameSession(req.user.id);
    res.status(201).json({ ok: true, session });
  } catch (e) {
    next(e);
  }
});

router.post("/complete/:id", authRequired, async (req, res, next) => {
  try {
    const { session, reward, user } = await completeGameSession(
      req.params.id,
      req.user.id
    );
    res.json({ ok: true, session, reward, user });
  } catch (e) {
    next(e);
  }
});

router.post("/claim/:id", authRequired, async (req, res, next) => {
  try {
    const { alreadyClaimed, reward, user } = await claimGameReward(
      req.params.id,
      req.user.id
    );
    res.json({ ok: true, alreadyClaimed, reward, user });
  } catch (e) {
    next(e);
  }
});

router.get("/reward-status/:bucket", authRequired, async (req, res, next) => {
  try {
    const { bucket } = req.params;
    const userId = req.user.id;

    const reward = await gameSortingReward.findOne({
      userId,
      dayBucket: bucket,
    });

    res.json({
      ok: true,
      alreadyClaimed: !!reward,
      reward: reward || null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
