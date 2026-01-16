const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'connects-india/cards',
    allowed_formats: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|svg|webp/;
    const ext = types.test(file.mimetype);
    if (ext) cb(null, true);
    else cb(new Error('Only .jpg, .jpeg, .png, .svg, .webp allowed'));
  },
});

module.exports = upload;

