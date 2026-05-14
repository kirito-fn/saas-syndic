import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { previewExcel, importExcel } from "./import.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".xlsx")) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier non supporté. Utilisez .xlsx"));
    }
  },
});

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.post(
  "/preview",
  authenticate,
  requireRole("ADMIN"),
  upload.single("file"),
  wrap(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier fourni" });
      return;
    }

    const result = await previewExcel(req.file.buffer);
    res.json(result);
  })
);

router.post(
  "/excel",
  authenticate,
  requireRole("ADMIN"),
  upload.single("file"),
  wrap(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier fourni" });
      return;
    }

    const result = await importExcel(req.file.buffer);
    res.json(result);
  })
);

export default router;
