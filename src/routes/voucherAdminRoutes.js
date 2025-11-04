import { Router } from "express";
import {
  createVoucherAdminHandler,
  updateVoucherAdminHandler,
  deleteVoucherAdminHandler,
  activateVoucherHandler,
  deactivateVoucherHandler,
  listVoucherAdminHandler,
  getVoucherRedemptionsHandler,
} from "../controllers/voucherAdminController.js";
import { adminRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.use(adminRequired);

router.get("/", listVoucherAdminHandler);
router.post("/", createVoucherAdminHandler);
router.patch("/:voucherId", updateVoucherAdminHandler);
router.delete("/:voucherId", deleteVoucherAdminHandler);
router.post("/:voucherId/activate", activateVoucherHandler);
router.post("/:voucherId/deactivate", deactivateVoucherHandler);
router.get("/:voucherId/redemptions", getVoucherRedemptionsHandler);

export default router;
