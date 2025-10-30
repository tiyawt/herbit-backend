import express from "express";
import {
  getTreeTracker,
  updateTreeTracker,

} from "../controllers/treeTrackersController.js";

import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua route ini butuh login
router.get("/", authRequired, getTreeTracker);
router.put("/", authRequired, updateTreeTracker);
router.post("/init", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const tracker = await createTreeTrackerForUser(userId);
    res.json({ success: true, tracker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



export default router;
