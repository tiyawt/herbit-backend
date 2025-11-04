import { Router } from "express";
import {
  listRedemptionsAdminHandler,
  getRedemptionDetailAdminHandler,
} from "../controllers/redemptionAdminController.js";
import { adminRequired } from "../middleware/authMiddleware.js";
const router = Router();

router.use(adminRequired);

router.get("/", listRedemptionsAdminHandler);
router.get("/:redemptionId", getRedemptionDetailAdminHandler);

export default router;
