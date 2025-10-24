import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordRoutes from "./passwordRoutes.js";

const router = Router();
router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);

export default router;
