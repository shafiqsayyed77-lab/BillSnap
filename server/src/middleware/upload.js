/**
 * File Upload Middleware (upload.js)
 * ----------------------------------
 * Handles receipt and bill image uploads using Multer.
 * 
 * Beginner Concept:
 * Multer parses multipart/form-data requests (which browsers send when uploading files).
 * It stores files directly on the server's local disk in 'server/uploads/'.
 * 
 * Security Checks:
 * 1) File type validation: only allows JPG, PNG, and WebP images.
 * 2) File size limit: max 5 MB per upload.
 * 3) Unique filenames: appends a timestamp and random suffix to avoid naming conflicts.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Determine __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory path (server/uploads)
const uploadDir = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize extension and generate unique filename
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `bill-${uniqueSuffix}${ext}`);
  },
});

// File filter to restrict uploads to images only
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(
      new Error('Unsupported file type. Only JPG, PNG, and WebP images are allowed.'),
      false
    );
  }
};

// 5 MB file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
});

export default upload;
