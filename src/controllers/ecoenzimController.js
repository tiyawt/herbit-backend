import Project from "../models/ecoenzimProject.js";
import Upload from "../models/ecoenzimUpload.js";
import User from "../models/user.js";

const calculateProjectStatus = async (project) => {
  const now = new Date();
  const endDate = new Date(project.endDate);
  const isAfterEndDate = now > endDate;

  const verifiedUploads = await Upload.countDocuments({
    ecoenzimProjectId: project._id,
    status: "verified",
    monthNumber: { $in: [1, 2, 3] } 
  });

  if (project.status === "completed") return { status: "completed", canClaim: false };
  if (isAfterEndDate) {
    return verifiedUploads >= 3 ? { status: "completed", canClaim: true } : { status: "cancelled", canClaim: false };
  }
  return { status: project.started ? "ongoing" : "not_started", canClaim: false };
};

export const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { organicWasteWeight, startDate, endDate } = req.body;

    if (!organicWasteWeight || organicWasteWeight <= 0) {
      return res.status(400).json({ error: "organicWasteWeight harus > 0" });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate dan endDate wajib diisi" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      return res.status(400).json({ error: "endDate harus setelah startDate" });
    }

    const existingProject = await Project.findOne({
      userId,
      status: { $in: ["ongoing", "not_started"] }
    });

    if (existingProject) {
      return res.status(400).json({ 
        error: "Anda sudah memiliki project aktif",
        existingProjectId: existingProject._id
      });
    }

    const newProject = new Project({
      userId,
      organicWasteWeight: parseFloat(organicWasteWeight),
      startDate: start,
      endDate: end,
      started: true,
      startedAt: new Date(),
      status: "ongoing",
      canClaim: false,
      prePointsEarned: 0
    });

    await newProject.save();
    res.status(201).json({ project: newProject });
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 10, page = 1 } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Project.countDocuments(filter);

    const updated = [];
    for (const p of projects) {
      const { status: newStatus, canClaim } = await calculateProjectStatus(p);
      if (newStatus !== p.status || canClaim !== p.canClaim) {
        p.status = newStatus;
        p.canClaim = canClaim;
        await p.save();
      }
      updated.push(p);
    }

    res.json({
      projects: updated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
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

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    const { status, canClaim } = await calculateProjectStatus(project);
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    const uploadsCount = await Upload.countDocuments({ ecoenzimProjectId: project._id });
    const verifiedPhotosCount = await Upload.countDocuments({ 
      ecoenzimProjectId: project._id,
      status: "verified",
      monthNumber: { $in: [1, 2, 3] }
    });

    res.json({
      ...project.toObject(),
      stats: {
        totalUploads: uploadsCount,
        verifiedPhotos: verifiedPhotosCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    const allowedUpdates = ["organicWasteWeight"];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.organicWasteWeight && updates.organicWasteWeight <= 0) {
      return res.status(400).json({ error: "organicWasteWeight harus > 0" });
    }

    if (["completed", "cancelled"].includes(project.status)) {
      return res.status(400).json({ error: "Tidak bisa mengubah project yang sudah selesai" });
    }

    Object.assign(project, updates);
    await project.save();

    res.json({ project });
  } catch (err) {
    console.error("updateProject error:", err);
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

    if (project.isClaimed) {
      return res.status(400).json({ error: "Tidak bisa menghapus project yang sudah diklaim" });
    }

    await Upload.deleteMany({ ecoenzimProjectId: id });

    await Project.findByIdAndDelete(id);

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
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

    if (project.started) {
      return res.status(400).json({ error: "Project sudah dimulai" });
    }

    project.started = true;
    project.startedAt = new Date();
    project.status = "ongoing";
    await project.save();
    
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createUpload = async (req, res) => {
  try {
    const userId = req.user.id;
    let { ecoenzimProjectId, monthNumber, photoUrl, uploadedDate } = req.body;

    const project = await Project.findById(ecoenzimProjectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden - Not your project" });
    }

    monthNumber = monthNumber === undefined || monthNumber === null || monthNumber === "" ? null : Number(monthNumber);
    photoUrl = photoUrl === undefined || photoUrl === null || photoUrl === "" ? null : photoUrl;
    uploadedDate = uploadedDate ? new Date(uploadedDate) : new Date();

    const isDailyUpload = monthNumber === null;

    let finalPoints = 0;
    
    if (isDailyUpload) {
      finalPoints = 0;
    } else {
      if (![1, 2, 3].includes(monthNumber)) {
        return res.status(400).json({ error: "monthNumber harus 1, 2, atau 3" });
      }
      if (!photoUrl) {
        return res.status(400).json({ error: "Foto wajib untuk upload progress bulanan" });
      }
      const existingUpload = await Upload.findOne({
        ecoenzimProjectId,
        monthNumber
      });
      
      if (existingUpload) {
        return res.status(400).json({ error: `Sudah ada upload foto untuk bulan ${monthNumber}` });
      }
      finalPoints = 50;
    }

    const newUpload = new Upload({
      ecoenzimProjectId,
      userId,
      monthNumber: isDailyUpload ? null : monthNumber,
      photoUrl: isDailyUpload ? null : photoUrl,
      uploadedDate,
      prePointsEarned: finalPoints,
      status: isDailyUpload ? "verified" : "pending"
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

    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const uploads = await Upload.find(filter)
      .sort({ uploadedDate: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'username email')
      .populate('ecoenzimProjectId', 'organicWasteWeight status');

    const total = await Upload.countDocuments(filter);

    res.json({
      uploads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
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

    const { type } = req.query; 
    const filter = { ecoenzimProjectId: req.params.projectId };

    if (type === 'daily') {
      filter.monthNumber = null;
    } else if (type === 'monthly') {
      filter.monthNumber = { $ne: null };
    }

    const uploads = await Upload.find(filter).sort({ uploadedDate: -1 });

    const stats = {
      total: uploads.length,
      verified: uploads.filter(u => u.status === 'verified').length,
      pending: uploads.filter(u => u.status === 'pending').length,
      dailyCheckIns: uploads.filter(u => u.monthNumber === null).length,
      monthlyPhotos: uploads.filter(u => u.monthNumber !== null).length,
      totalPoints: uploads
        .filter(u => u.status === 'verified')
        .reduce((sum, u) => sum + (u.prePointsEarned || 0), 0)
    };

    return res.json({ uploads, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUploadById = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .populate('ecoenzimProjectId', 'organicWasteWeight status');

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    if (upload.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ upload });
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

    if (upload.status === 'verified') {
      return res.status(400).json({ error: "Upload sudah diverifikasi" });
    }

    upload.status = "verified";
    await upload.save();

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

export const rejectUpload = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin only" });
    }

    const { reason } = req.body;
    const upload = await Upload.findById(req.params.id);
    
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    upload.status = "rejected";
    upload.rejectionReason = reason || "Foto tidak sesuai kriteria";
    await upload.save();

    res.json({ upload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    if (upload.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (upload.status === 'verified') {
      return res.status(400).json({ error: "Tidak bisa menghapus upload yang sudah diverifikasi" });
    }

    await Upload.findByIdAndDelete(req.params.id);

    res.json({ message: "Upload deleted successfully" });
  } catch (err) {
    console.error("deleteUpload error:", err);
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

    if (project.isClaimed) {
      return res.status(400).json({ error: "Poin sudah diklaim sebelumnya" });
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
        status: project.status,
        requirements: {
          completed: status === "completed",
          hasThreePhotos: false 
        }
      });
    }

    const pointsToAdd = project.prePointsEarned || 0;

    project.points = pointsToAdd;
    project.prePointsEarned = null;
    project.isClaimed = true;
    project.claimedAt = new Date();
    project.status = "completed";
    project.canClaim = false;

    await project.save();

    const user = await User.findById(project.userId);
    user.totalPoints = (user.totalPoints || 0) + pointsToAdd;
    await user.save();

    res.json({ 
      success: true, 
      points: pointsToAdd,
      user: {
        id: user._id,
        totalPoints: user.totalPoints
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalProjects = await Project.countDocuments({ userId });
    const completedProjects = await Project.countDocuments({ userId, status: "completed" });
    const ongoingProjects = await Project.countDocuments({ userId, status: "ongoing" });
    const cancelledProjects = await Project.countDocuments({ userId, status: "cancelled" });
    const claimedProjects = await Project.countDocuments({ userId, isClaimed: true });

    const totalUploads = await Upload.countDocuments({ userId });
    const verifiedUploads = await Upload.countDocuments({ userId, status: "verified" });
    const pendingUploads = await Upload.countDocuments({ userId, status: "pending" });

    const totalPointsEarned = await Project.aggregate([
      { $match: { userId: req.user.id, isClaimed: true } },
      { $group: { _id: null, total: { $sum: "$points" } } }
    ]);

    res.json({
      projects: {
        total: totalProjects,
        completed: completedProjects,
        ongoing: ongoingProjects,
        cancelled: cancelledProjects,
        claimed: claimedProjects
      },
      uploads: {
        total: totalUploads,
        verified: verifiedUploads,
        pending: pendingUploads
      },
      points: {
        totalEarned: totalPointsEarned[0]?.total || 0
      }
    });
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
    let completedCount = 0;
    
    for (const project of expiredProjects) {
      const verifiedPhotos = await Upload.countDocuments({
        ecoenzimProjectId: project._id,
        status: "verified",
        monthNumber: { $in: [1, 2, 3] }
      });

      if (verifiedPhotos >= 3) {
        project.status = "completed";
        project.canClaim = true;
        completedCount++;
      } else {
        project.status = "cancelled";
        project.canClaim = false;
        cancelledCount++;
      }
      
      await project.save();
    }

    console.log(`✅ Auto-processed: ${completedCount} completed, ${cancelledCount} cancelled`);
    return { completedCount, cancelledCount };
  } catch (err) {
    console.error("❌ Error in autoCancelExpiredProjects:", err);
    throw err;
  }
};