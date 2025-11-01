// src/routes/notificationRoutes.js
import express from "express";
import passport from "../config/passport.js";
import {
  listUserNotifications,
  markRead,
  markAllRead,
  clearAllNotifications,
} from "../services/notificationService.js";

const router = express.Router();

router.use(passport.authenticate("jwt", { session: false }));

// GET /api/notifications
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unreadOnly = req.query.unread === "1";
    const data = await listUserNotifications(userId, { unreadOnly });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const data = await markRead(req.params.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type } = req.body;
    const data = await markAllRead(userId, type);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/notifications/clear-all
router.delete("/clear-all", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await clearAllNotifications(userId);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (e) {
    next(e);
  }
});

export default router;
