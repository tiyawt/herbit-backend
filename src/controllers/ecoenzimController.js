// backend/src/controllers/ecoenzimController.js
import Project from "../models/ecoenzimProject.js";
import Upload from "../models/ecoenzimUpload.js";

const calculateProjectStatus = async (project) => {
  const now = new Date();
  const endDate = new Date(project.endDate);
  const isAfterEndDate = now > endDate;

  const verifiedUploads = await Upload.countDocuments({
    ecoenzimProjectId: project._id,
    status: "verified"
  });

  if (project.status === "completed") return { status: "completed", canClaim: false };
  if (isAfterEndDate) {
    return verifiedUploads >= 3 ? { status: "completed", canClaim: true } : { status: "cancelled", canClaim: false };
  }
  return { status: project.started ? "ongoing" : "not_started", canClaim: false };
};

// ==================== PROJECT CONTROLLERS ====================

export const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({ userId });
    const updated = [];

    for (const p of projects) {
      const { status, canClaim } = await calculateProjectStatus(p);
      if (status !== p.status || canClaim !== p.canClaim) {
        p.status = status;
        p.canClaim = canClaim;
        await p.save();
      }
      updated.push(p);
    }

    res.json(updated);
  } catch (err) {
    console.error("getProjects error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify ownership
    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    const { status, canClaim } = await calculateProjectStatus(project);
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { organicWasteWeight, startDate, endDate } = req.body;

    const newProject = new Project({
      userId,
      organicWasteWeight: organicWasteWeight || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      started: true,
      startedAt: new Date(),
      status: "ongoing",
      canClaim: false,
      prePointsEarned: 0 // 👈 Start with 0 points
    });

    await newProject.save();
    res.status(201).json({ project: newProject });
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const startProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    project.started = true;
    project.startedAt = new Date();
    project.status = "ongoing";
    await project.save();
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    await Upload.deleteMany({ ecoenzimProjectId: id });
    await Project.findByIdAndDelete(id);

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==================== UPLOAD CONTROLLERS ====================

export const createUpload = async (req, res) => {
  try {
    const userId = req.user.id;
    let { ecoenzimProjectId, monthNumber, photoUrl, uploadedDate, prePointsEarned } = req.body;

    const project = await Project.findById(ecoenzimProjectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    // Normalisasi
    monthNumber = monthNumber === undefined || monthNumber === null || monthNumber === "" ? null : Number(monthNumber);
    photoUrl = photoUrl === undefined || photoUrl === null || photoUrl === "" ? null : photoUrl;
    uploadedDate = uploadedDate ? new Date(uploadedDate) : new Date();

    const isDailyUpload = monthNumber === null;

    // 👇 POINT LOGIC UPDATED
    let finalPoints = 0;
    
    if (isDailyUpload) {
      // Daily check-in = 0 points
      finalPoints = 0;
    } else {
      // Photo upload
      if (![1, 2, 3].includes(monthNumber)) {
        return res.status(400).json({ error: "monthNumber harus 1, 2, atau 3" });
      }
      if (!photoUrl) {
        return res.status(400).json({ error: "Foto wajib untuk upload progress bulanan" });
      }

      // Check duplicate
      const existingUpload = await Upload.findOne({
        ecoenzimProjectId,
        monthNumber
      });
      
      if (existingUpload) {
        return res.status(400).json({ error: "Sudah ada upload foto untuk bulan ini" });
      }

      // Photo upload = 50 points
      finalPoints = 50;
    }

    const newUpload = new Upload({
      ecoenzimProjectId,
      userId,
      monthNumber: isDailyUpload ? null : monthNumber,
      photoUrl: isDailyUpload ? null : photoUrl,
      uploadedDate,
      prePointsEarned: finalPoints,
      status: isDailyUpload ? "verified" : "pending" // Daily auto-verified
    });

    await newUpload.save();

    // Update project prePointsEarned (only verified uploads)
    const allVerifiedUploads = await Upload.find({
      ecoenzimProjectId,
      status: "verified"
    });

    const totalPoints = allVerifiedUploads.reduce((sum, upload) => {
      return sum + (upload.prePointsEarned || 0);
    }, 0);

    project.prePointsEarned = totalPoints;
    await project.save();

    res.status(201).json({ upload: newUpload });
  } catch (err) {
    console.error("createUpload error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

export const getAllUploads = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin only" });
    }
    
    const uploads = await Upload.find().sort({ uploadedDate: -1 });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUploadsByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    const uploads = await Upload.find({
      ecoenzimProjectId: req.params.projectId,
    }).sort({ uploadedDate: -1 });

    return res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyUpload = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin only" });
    }

    const upload = await Upload.findById(req.params.id);
    
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    upload.status = "verified";
    await upload.save();

    // Update project prePointsEarned
    const project = await Project.findById(upload.ecoenzimProjectId);
    const allVerifiedUploads = await Upload.find({
      ecoenzimProjectId: upload.ecoenzimProjectId,
      status: "verified"
    });

    const totalPoints = allVerifiedUploads.reduce((sum, u) => {
      return sum + (u.prePointsEarned || 0);
    }, 0);
    
    project.prePointsEarned = totalPoints;
    await project.save();

    res.json({ upload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const claimPoints = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    const { status, canClaim } = await calculateProjectStatus(project);
    
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    if (!canClaim) {
      return res.status(400).json({ 
        error: "Syarat klaim belum terpenuhi",
        status: project.status
      });
    }

    // Process claim
    project.points = project.prePointsEarned;
    project.prePointsEarned = null;
    project.isClaimed = true;
    project.claimedAt = new Date();
    project.status = "completed";
    project.canClaim = false;

    await project.save();
    res.json({ success: true, points: project.points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const autoCancelExpiredProjects = async () => {
  try {
    const now = new Date();
    const expiredProjects = await Project.find({
      status: "ongoing",
      endDate: { $lt: now }
    });

    let cancelledCount = 0;
    
    for (const project of expiredProjects) {
      const verifiedUploads = await Upload.countDocuments({
        ecoenzimProjectId: project._id,
        status: "verified"
      });

      if (verifiedUploads < 3) {
        project.status = "cancelled";
        project.canClaim = false;
        await project.save();
        cancelledCount++;
      }
    }

    console.log(`✅ Auto-cancelled ${cancelledCount} expired projects`);
    return cancelledCount;
  } catch (err) {
    console.error("❌ Error in autoCancelExpiredProjects:", err);
    throw err;
  }
};