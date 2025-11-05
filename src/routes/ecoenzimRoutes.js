import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  startProject,
  deleteProject,
  getAllUploads,
  getUploadsByProject,
  getUploadById,
  createUpload,
  verifyUpload,
  rejectUpload,
  deleteUpload,
  claimPoints,
  getUserStats
} from "../controllers/ecoenzimController.js";
import { authRequired, adminRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/projects", authRequired, getProjects);
router.get("/projects/:id", authRequired, getProjectById);
router.post("/projects", authRequired, createProject);
router.put("/projects/:id", authRequired, updateProject);
router.patch("/projects/:id/start", authRequired, startProject);
router.delete("/projects/:id", authRequired, deleteProject);
router.get("/uploads", authRequired, adminRequired, getAllUploads);
router.get("/uploads/project/:projectId", authRequired, getUploadsByProject);
router.get("/uploads/:id", authRequired, getUploadById);
router.post("/uploads", authRequired, createUpload);
router.put("/uploads/:id/verify", authRequired, adminRequired, verifyUpload);
router.put("/uploads/:id/reject", authRequired, adminRequired, rejectUpload);
router.delete("/uploads/:id", authRequired, deleteUpload);
router.post("/projects/:id/claim", authRequired, claimPoints);
router.get("/stats/me", authRequired, getUserStats);

export default router;