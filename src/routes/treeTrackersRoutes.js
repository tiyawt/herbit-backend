import express from "express";
import {
  getTreeTracker,
  updateTreeTracker,
  createNewTreeTracker,


} from "../controllers/treeTrackersController.js";

import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua route ini butuh login
router.get("/", authRequired, getTreeTracker);
router.put("/", authRequired, updateTreeTracker);
router.post("/create", authRequired, createNewTreeTracker);


export default router;
