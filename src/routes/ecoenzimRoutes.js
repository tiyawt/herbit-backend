// backend/src/routes/ecoenzimRoutes.js
import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  startProject,
  getAllUploads,
  getUploadsByProject,
  createUpload,
  verifyUpload,
  claimPoints,
  deleteProject
} from "../controllers/ecoenzimController.js";
import { authRequired, adminRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Project routes (all protected)
router.get("/projects", authRequired, getProjects);
router.get("/projects/:id", authRequired, getProjectById);
router.post("/projects", authRequired, createProject);
router.patch("/projects/:id/start", authRequired, startProject);
router.delete("/projects/:id", authRequired, deleteProject);

// Upload routes
router.get("/uploads", authRequired, adminRequired, getAllUploads); 
router.get("/uploads/project/:projectId", authRequired, getUploadsByProject);
router.post("/uploads", authRequired, createUpload);
router.put("/uploads/:id/verify", authRequired, adminRequired, verifyUpload);

// Claim route
router.post("/projects/:id/claim", authRequired, claimPoints);

export default router;