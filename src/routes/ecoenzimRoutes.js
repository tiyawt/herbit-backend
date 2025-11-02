// src/routes/ecoenzimRoutes.js
import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  getAllUploads,
  getUploadsByProject,
  createUpload,
  verifyUpload,
  claimPoints,
  deleteProject 
} from "../controllers/ecoenzimController.js";

const router = express.Router();

// Projects
router.get("/projects", getProjects);
router.get("/projects/:id", getProjectById);
router.post("/projects", createProject);
router.delete("/projects/:id", deleteProject);
// Uploads
router.get("/uploads", getAllUploads);
router.get("/uploads/project/:projectId", getUploadsByProject);
router.post("/uploads", createUpload);
router.put("/uploads/:id/verify", verifyUpload);

// Claim
router.post("/projects/:id/claim", claimPoints);

export default router;