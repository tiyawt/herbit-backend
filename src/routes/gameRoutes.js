import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { startGameSession, completeGameSession } from "../services/gameSortingService.js";

const router = Router();

router.post("/start", authRequired, async (req, res, next) => {
  try {
    const session = await startGameSession(req.user.id);
    res.status(201).json({ ok: true, session });
  } catch (e) { next(e); }
});

router.post("/complete/:id", authRequired, async (req, res, next) => {
  try {
    const { session, reward } = await completeGameSession(req.params.id, req.user.id);
    res.json({ ok: true, session, reward });
  } catch (e) { next(e); }
});

export default router;
