import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordRoutes from "./passwordRoutes.js";
import voucherRoutes from "./voucherRoutes.js";
import voucherAdminRoutes from "./voucherAdminRoutes.js";
import rewardRoutes from "./rewardRoutes.js";
import rewardAdminRoutes from "./rewardAdminRoutes.js";
import treeRoutes from "./treeRoutes.js";
import dailyTaskRoutes from "./dailyTaskRoutes.js";
import gameRoutes from "./gameRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";
import milestoneClaimAdminRoutes from "./milestoneClaimAdminRoutes.js";
import pointsHistoryAdminRoutes from "./pointsHistoryAdminRoutes.js";
import redemptionRoutes from "./redemptionRoutes.js";
import redemptionAdminRoutes from "./redemptionAdminRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);

router.use("/vouchers", voucherRoutes);
router.use("/admin/vouchers", voucherAdminRoutes);
router.use("/redemptions", redemptionRoutes);
router.use("/admin/redemptions", redemptionAdminRoutes);

router.use("/rewards", rewardRoutes);
router.use("/admin/rewards", rewardAdminRoutes);
router.use("/admin/milestone-claims", milestoneClaimAdminRoutes);
router.use("/admin/points-history", pointsHistoryAdminRoutes);

router.use("/trees", treeRoutes);
router.use("/daily-tasks", dailyTaskRoutes);
router.use("/games", gameRoutes);
router.use("/notifications", notificationRoutes);
router.use("/users", userRoutes);

export default router;
