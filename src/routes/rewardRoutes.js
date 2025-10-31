import { Router } from "express";
import {
  claimRewardHandler,
  createRewardHandler,
  deleteRewardHandler,
  getRewardHandler,
  listRewardsHandler,
  updateRewardHandler,
} from "../controllers/rewardController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", listRewardsHandler);
router.post("/", createRewardHandler);
router.put("/:rewardId", updateRewardHandler);
router.delete("/:rewardId", deleteRewardHandler);

router.post("/:rewardCode/claim", authRequired, claimRewardHandler);

router.get("/:rewardId", getRewardHandler);

export default router;
