import { Router } from "express";
import {
  getUserProfileSummaryHandler,
  getMyHomeSummaryHandler,
} from "../controllers/userController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/home-summary", authRequired, getMyHomeSummaryHandler);
router.get("/profile-summary", authRequired, getUserProfileSummaryHandler);

export default router;
