import { Router } from "express";
import {
  getUserProfileSummaryHandler,
  getMyHomeSummaryHandler,
} from "../controllers/userController.js";
import {
  getUsernameSuggestionsHandler,
  updateUsernameHandler,
} from "../controllers/usernameController.js";
import { updateEmailHandler } from "../controllers/emailController.js";
import {
  uploadProfilePhotoHandler,
  getProfilePhotoHandler,
} from "../controllers/profilePhotoController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import profilePhotoUpload from "../middleware/profilePhotoUpload.js";
import { MulterError } from "multer";
import { fail } from "../utils/response.js";

const router = Router();

router.get("/home-summary", authRequired, getMyHomeSummaryHandler);
router.get("/profile-summary", authRequired, getUserProfileSummaryHandler);
router.patch("/username", authRequired, updateUsernameHandler);
router.get("/username-suggestions", getUsernameSuggestionsHandler);
router.patch("/email", authRequired, updateEmailHandler);
router.get("/profile-photo/:fileId", authRequired, getProfilePhotoHandler);
router.post(
  "/profile-photo",
  authRequired,
  (req, res, next) => {
    profilePhotoUpload.single("photo")(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return fail(res, "UPLOAD_ERROR", "Ukuran file maksimum 3 MB", 400);
        }
        if (err.code === "UNSUPPORTED_FILE_TYPE") {
          return fail(
            res,
            "UNSUPPORTED_FILE_TYPE",
            "Format file tidak didukung",
            400
          );
        }
        return fail(
          res,
          "UPLOAD_ERROR",
          err.message || "Gagal mengunggah foto",
          400
        );
      }

      return fail(
        res,
        "UPLOAD_ERROR",
        err?.message || "Gagal mengunggah foto",
        500
      );
    });
  },
  uploadProfilePhotoHandler
);

export default router;
