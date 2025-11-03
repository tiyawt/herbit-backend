import { Router } from "express";
import { adminRequired } from "../middleware/authMiddleware.js";
import {
  listDailyTasksAdminHandler,
  getDailyTaskAdminHandler,
  createDailyTaskAdminHandler,
  updateDailyTaskAdminHandler,
  deleteDailyTaskAdminHandler,
} from "../controllers/dailyTaskAdminController.js";

const router = Router();

router.use(adminRequired);

router.get("/", listDailyTasksAdminHandler);
router.get("/:taskId", getDailyTaskAdminHandler);
router.post("/", createDailyTaskAdminHandler);
router.patch("/:taskId", updateDailyTaskAdminHandler);
router.delete("/:taskId", deleteDailyTaskAdminHandler);

export default router;
