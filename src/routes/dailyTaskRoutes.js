import { Router } from "express";
import {
  listDailyTasksHandler,
  listDailyTaskChecklistHandler,
} from "../controllers/dailyTaskController.js";

const router = Router();

router.get("/", listDailyTasksHandler);
router.get("/checklist", listDailyTaskChecklistHandler);

export default router;
