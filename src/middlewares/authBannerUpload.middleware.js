const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'connects-india/auth-banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // No transformation — preserve original for quality
  },
});

const authBannerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|webp/;
    if (types.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  },
});

module.exports = authBannerUpload;
