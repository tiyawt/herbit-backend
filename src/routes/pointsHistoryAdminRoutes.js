import { Router } from "express";
import {
  listPointsHistoryAdminHandler,
  getUserPointsHistoryAdminHandler,
} from "../controllers/pointsHistoryAdminController.js";

const router = Router();

router.get("/", listPointsHistoryAdminHandler);
router.get("/:userId", getUserPointsHistoryAdminHandler);

export default router;
