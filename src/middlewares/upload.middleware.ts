// src/middlewares/upload.middleware.ts
import { fileURLToPath } from 'url';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import type { Request, Response, NextFunction } from 'express';
import tagModel from '../models/tag.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempUploadPath = path.join(__dirname, '../../uploads/tmp');

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    fs.mkdirsSync(tempUploadPath);
    cb(null, tempUploadPath);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to move the file after upload
export const moveFileToPrimaryTag = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { primaryTag } = req.body;
    const file = req.file;

    if (!primaryTag || typeof primaryTag !== 'string') {
      // throw new Error('primaryTag is required in the body');
      return _res.status(400).json({ message: "PrimaryTag is mandatory"})
    }
    if (!file) {
      throw new Error('No file uploaded');
    }

    const isPrimaryTag = await tagModel.findOne({_id:primaryTag, ownerId: req.user.sub})
    if(!isPrimaryTag){
      return _res.status(400).json({ message: "Primary tag not found or not owned by user"})
    }
    const targetDir = path.join(__dirname, `../../uploads/${primaryTag}`);
    await fs.mkdirs(targetDir);

    const oldPath = file.path;
    const newPath = path.join(targetDir, path.basename(file.path));

    await fs.move(oldPath, newPath, { overwrite: true });

    (req as any).savedFile = file.filename;

    next();
  } catch (error) {
    next(error);
  }
};

export default upload;
