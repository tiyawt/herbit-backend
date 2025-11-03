import { Router } from "express";
import {
  listPointsHistoryAdminHandler,
  getUserPointsHistoryAdminHandler,
} from "../controllers/pointsHistoryAdminController.js";
import { adminRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.use(adminRequired);

router.get("/", listPointsHistoryAdminHandler);
router.get("/:userId", getUserPointsHistoryAdminHandler);

export default router;
