import { Router } from "express";
import {
  listVoucherHandler,
  getVoucherDetailHandler,
  getVoucherBySlugHandler,
  previewVoucherHandler,
  claimVoucherHandler,
} from "../controllers/voucherController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", listVoucherHandler);
router.get("/:voucherId", getVoucherDetailHandler);
router.get("/slug/:slug", getVoucherBySlugHandler);
router.post("/:voucherId/preview", authRequired, previewVoucherHandler);
router.post("/:voucherId/claim", authRequired, claimVoucherHandler);

export default router;
