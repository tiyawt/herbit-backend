import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { getAvailableLeaves } from "../controllers/treeLeavesController.js";

const router = express.Router();

router.get("/", authRequired, getAvailableLeaves);

export default router;
