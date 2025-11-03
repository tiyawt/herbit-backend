// src/routes/ecoenzimRoutes.js
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

const router = express.Router();

router.get("/projects", getProjects);
router.get("/projects/:id", getProjectById);
router.post("/projects", createProject);
router.patch("/projects/:id/start", startProject);
router.delete("/projects/:id", deleteProject);

router.get("/uploads", getAllUploads);
router.get("/uploads/project/:projectId", getUploadsByProject);
router.post("/uploads", createUpload);
router.put("/uploads/:id/verify", verifyUpload);

router.post("/projects/:id/claim", claimPoints);

export default router;
