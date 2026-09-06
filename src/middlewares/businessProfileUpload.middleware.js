const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Handles the fields used when creating/updating a (business) profile:
// profileImage / coverImage (images only, same as upload.middleware.js) plus
// businessDocument (the verification document — allows PDF in addition to images).

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const DOCUMENT_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const destinationFor = (fieldname) =>
  fieldname === 'businessDocument' ? '../../uploads/business-documents' : '../../uploads/profiles';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, destinationFor(file.fieldname));
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (documents can be larger than logos)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = file.fieldname === 'businessDocument' ? DOCUMENT_EXTS : IMAGE_EXTS;
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(
        file.fieldname === 'businessDocument'
          ? 'Business document must be a PDF, JPG, PNG, or WEBP file'
          : 'Only .jpg, .jpeg, .png, .webp allowed'
      ));
    }
  },
});

const folderFor = (fieldname) =>
  fieldname === 'businessDocument' ? 'business-documents' : 'profiles';

const processUpload = (req, res, next) => {
  if (req.file) {
    req.file.path = `/uploads/${folderFor(req.file.fieldname)}/${req.file.filename}`;
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.path = `/uploads/${folderFor(file.fieldname)}/${file.filename}`;
      });
    } else {
      Object.keys(req.files).forEach(field => {
        if (Array.isArray(req.files[field])) {
          req.files[field].forEach(file => {
            file.path = `/uploads/${folderFor(field)}/${file.filename}`;
          });
        } else if (req.files[field] && typeof req.files[field] === 'object') {
          req.files[field].path = `/uploads/${folderFor(field)}/${req.files[field].filename}`;
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
