import { Router } from "express";
import {
  getMyRedemptionsHandler,
  getMyRedemptionDetailHandler,
} from "../controllers/redemptionController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authRequired);

router.get("/me", getMyRedemptionsHandler);
router.get("/:redemptionId", getMyRedemptionDetailHandler);

export default router;
