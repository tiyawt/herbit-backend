import express from "express";
import { claimFruit, getAvailableFruits } from "../controllers/treeFruitsController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authRequired, getAvailableFruits);
router.patch("/:id/claim", authRequired, claimFruit);

export default router;
