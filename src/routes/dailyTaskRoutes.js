import express from "express";
import { getTodayTasks } from "../controllers/dailyTaskController.js";


const router = express.Router();

router.get("/", getTodayTasks);

export default router;
