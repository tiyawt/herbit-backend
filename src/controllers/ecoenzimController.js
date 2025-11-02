import Project from "../models/ecoenzimProject.js";
import Upload from "../models/ecoenzimUploadProgress.js";

// Helper: Hitung status proyek
const calculateProjectStatus = async (project) => {
  const now = new Date();
  const endDate = new Date(project.endDate);
  const isAfterEndDate = now > endDate;

  // Hitung upload yang sudah diverifikasi
  const verifiedUploads = await Upload.countDocuments({
    ecoenzimProjectId: project._id,
    status: "verified"
  });

  const hasAllUploads = verifiedUploads >= 3;

  // Aturan bisnis
  if (project.status === "completed") {
    return { status: "completed", canClaim: false };
  }

  if (isAfterEndDate) {
    if (hasAllUploads) {
      return { status: "completed", canClaim: true };
    } else {
      return { status: "cancelled", canClaim: false };
    }
  }

  return { status: "ongoing", canClaim: false };
};

// Helper: Validasi hari upload
const isValidUploadDay = (project, uploadDate) => {
  const startDate = new Date(project.startDate);
  const diffTime = Math.abs(uploadDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return [30, 60, 90].includes(diffDays);
};

// --------------------
// PROJECT CONTROLLERS
// --------------------

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user?._id || req.query.userId });
    
    // Update status untuk setiap proyek
    const updatedProjects = [];
    for (const project of projects) {
      const { status, canClaim } = await calculateProjectStatus(project);
      if (status !== project.status || canClaim !== project.canClaim) {
        project.status = status;
        project.canClaim = canClaim;
        await project.save();
      }
      updatedProjects.push(project);
    }

    res.json(updatedProjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { status, canClaim } = await calculateProjectStatus(project);
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    // Populate uploads
    const uploads = await Upload.find({ ecoenzimProjectId: project._id });
    project.uploads = uploads;

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const { userId, organicWasteWeight, startDate, endDate } = req.body;

    const newProject = new Project({
      userId,
      organicWasteWeight,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "ongoing",
      canClaim: false,
      prePointsEarned: 0,
      points: 0,
      isClaimed: false
    });

    await newProject.save();
    res.status(201).json({ project: newProject });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// UPLOAD CONTROLLERS
// --------------------

// src/controllers/ecoenzimController.js

export const createUpload = async (req, res) => {
  try {
    const { ecoenzimProjectId, userId, monthNumber, photoUrl, uploadedDate, prePointsEarned } = req.body;

    const project = await Project.findById(ecoenzimProjectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // ✅ HANYA validasi hari jika monthNumber ada dan 1/2/3
    if (monthNumber !== undefined && [1, 2, 3].includes(monthNumber)) {
      const uploadDate = new Date(uploadedDate);
      if (!isValidUploadDay(project, uploadDate)) {
        return res.status(400).json({ 
          error: "Upload foto hanya diizinkan di hari ke-30, 60, atau 90 sejak mulai fermentasi" 
        });
      }
    }


    // Cek apakah sudah ada upload untuk bulan ini (untuk upload foto)
    if (!isDailyUpload && monthNumber) {
      const existingUpload = await Upload.findOne({
        ecoenzimProjectId,
        monthNumber
      });
      if (existingUpload) {
        return res.status(400).json({ error: "Sudah ada upload untuk bulan ini" });
      }
    }

    const newUpload = new Upload({
      ecoenzimProjectId,
      userId,
      monthNumber: isDailyUpload ? 1 : monthNumber, // Default 1 untuk daily
      photoUrl: isDailyUpload ? "https://picsum.photos/400/300?random=" + Date.now() : photoUrl,
      uploadedDate: new Date(uploadedDate),
      prePointsEarned: isDailyUpload ? Math.round(prePointsEarned) : 50, // 50 untuk foto, dynamic untuk daily
      status: isDailyUpload ? "verified" : "pending" // Daily upload langsung verified
    });

    await newUpload.save();

    // Update prePointsEarned di project
    const totalVerified = await Upload.countDocuments({
      ecoenzimProjectId,
      status: "verified"
    });
    project.prePointsEarned = totalVerified * 50;
    await project.save();

    res.status(201).json({ upload: newUpload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUploads = async (req, res) => {
  try {
    const uploads = await Upload.find();
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUploadsByProject = async (req, res) => {
  try {
    const uploads = await Upload.find({
      ecoenzimProjectId: req.params.projectId,
    });

    if (!uploads || uploads.length === 0) {
      return res.status(404).json({ error: "No uploads found for this project" });
    }

    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const verifyUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });

    upload.status = "verified";
    await upload.save();

    // Update project prePointsEarned
    const project = await Project.findById(upload.ecoenzimProjectId);
    const totalVerified = await Upload.countDocuments({
      ecoenzimProjectId: upload.ecoenzimProjectId,
      status: "verified"
    });
    project.prePointsEarned = totalVerified * 50;
    await project.save();

    res.json({ upload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// CLAIM CONTROLLER
// --------------------

export const claimPoints = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Ambil status terbaru
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

    // Proses klaim
    project.points = project.prePointsEarned;
    project.prePointsEarned = null; // Sesuai contoh data
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

// --------------------
// CRON JOB: AUTO-CANCEL EXPIRED PROJECTS
// --------------------

export const autoCancelExpiredProjects = async () => {
  try {
    const now = new Date();
    
    // Cari proyek ongoing yang sudah lewat endDate
    const expiredProjects = await Project.find({
      status: "ongoing",
      endDate: { $lt: now }
    });

    let cancelledCount = 0;
    for (const project of expiredProjects) {
      // Cek jumlah upload verified
      const verifiedUploads = await Upload.countDocuments({
        ecoenzimProjectId: project._id,
        status: "verified"
      });

      // Jika kurang dari 3, cancel
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


export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hapus semua upload terkait
    await Upload.deleteMany({ ecoenzimProjectId: id });
    
    // Hapus project
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: err.message });
  }
};