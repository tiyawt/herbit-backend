import { Router } from "express";
import {
  listMilestoneClaimsAdminHandler,
  getMilestoneClaimAdminHandler,
} from "../controllers/milestoneClaimAdminController.js";
import { adminRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.use(adminRequired);

router.get("/", listMilestoneClaimsAdminHandler);
router.get("/:claimId", getMilestoneClaimAdminHandler);

export default router;
