import { Router } from "express";
import {
  listTreeTrackersHandler,
  listTreeLeavesHandler,
  listTreeFruitsHandler,
} from "../controllers/treeController.js";

const router = Router();

router.get("/trackers", listTreeTrackersHandler);
router.get("/leaves", listTreeLeavesHandler);
router.get("/fruits", listTreeFruitsHandler);

export default router;
