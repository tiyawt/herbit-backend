import { Router } from "express";
import {
  getVoucherDetailHandler,
  getVoucherHistoryHandler,
  getVoucherSummaryHandler,
  listVoucherHandler,
  redeemVoucherHandler,
} from "../controllers/voucherController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authRequired, listVoucherHandler);
router.get("/summary", authRequired, getVoucherSummaryHandler);
router.get("/history", authRequired, getVoucherHistoryHandler);
router.post("/:voucherId/redeem", authRequired, redeemVoucherHandler);
router.get("/:voucherId", authRequired, getVoucherDetailHandler);

export default router;
