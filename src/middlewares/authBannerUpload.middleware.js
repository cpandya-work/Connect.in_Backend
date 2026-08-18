const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/auth-banners');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  },
});

const processUpload = (req, res, next) => {
  if (req.file) {
    req.file.path = `/uploads/auth-banners/${req.file.filename}`;
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.path = `/uploads/auth-banners/${file.filename}`;
      });
    } else {
      Object.keys(req.files).forEach(field => {
        if (Array.isArray(req.files[field])) {
          req.files[field].forEach(file => {
            file.path = `/uploads/auth-banners/${file.filename}`;
          });
        } else if (req.files[field] && typeof req.files[field] === 'object') {
          req.files[field].path = `/uploads/auth-banners/${req.files[field].filename}`;
        }
      });
    }
  }
  next();
};

const makeUploadMiddleware = (multerInstance) => {
  return {
    single: (fieldname) => [multerInstance.single(fieldname), processUpload],
    array: (fieldname, maxCount) => [multerInstance.array(fieldname, maxCount), processUpload],
    fields: (fields) => [multerInstance.fields(fields), processUpload],
    none: () => [multerInstance.none(), processUpload],
    any: () => [multerInstance.any(), processUpload]
  };
};

module.exports = makeUploadMiddleware(multerUpload);
