import multer from "multer";

export const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype) || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type"));
  },
});

export function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large (max 10MB)"
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unsupported file type"
          : err.message;
    return res.status(400).json({ error: message });
  }
  next(err);
}
