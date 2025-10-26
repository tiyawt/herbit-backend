import { Router } from "express";
import {
  claimRewardHandler,
  listRewardsHandler,
} from "../controllers/rewardController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", listRewardsHandler);
router.post("/:rewardCode/claim", authRequired, claimRewardHandler);

export default router;
