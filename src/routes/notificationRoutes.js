// src/routes/notificationRoutes.js
import express from "express";
import { listUserNotifications, markRead, markAllRead } from "../services/notificationService.js";

const router = express.Router();

// GET /notifications?unread=1
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?._id || req.query.userId;
    const unreadOnly = req.query.unread === "1";
    const data = await listUserNotifications(userId, { unreadOnly });
    res.json(data);
  } catch (e) { next(e); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const data = await markRead(req.params.id);
    res.json(data);
  } catch (e) { next(e); }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { type } = req.body; 
    const data = await markAllRead(userId, type);
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
