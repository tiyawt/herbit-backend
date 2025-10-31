import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordRoutes from "./passwordRoutes.js";
import voucherRoutes from "./voucherRoutes.js";
import rewardRoutes from "./rewardRoutes.js";
import treeRoutes from "./treeRoutes.js";
import dailyTaskRoutes from "./dailyTaskRoutes.js";
import ecoenzymRoutes from "./ecoenzymRoutes.js";
import gameRoutes from "./gameRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/rewards", rewardRoutes);
router.use("/trees", treeRoutes);
router.use("/daily-tasks", dailyTaskRoutes);
router.use("/ecoenzym", ecoenzymRoutes);
router.use("/games", gameRoutes);
router.use("/notifications", notificationRoutes);
router.use("/users", userRoutes);

export default router;
