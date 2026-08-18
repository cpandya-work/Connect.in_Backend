const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const getPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  const pathParts = parts[1].split('/');
  const isVersion = /^v\d+$/.test(pathParts[0]);
  const startIdx = isVersion ? 1 : 0;
  const publicIdWithExt = pathParts.slice(startIdx).join('/');
  const lastDotIdx = publicIdWithExt.lastIndexOf('.');
  return lastDotIdx > -1 ? publicIdWithExt.substring(0, lastDotIdx) : publicIdWithExt;
};

/**
 * Delete image from Cloudinary or Local Storage
 */
const deleteFromCloudinary = async (url) => {
  if (!url) return;
  if (url.startsWith('/uploads')) {
    const absolutePath = path.join(__dirname, '../../', url);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log('Successfully deleted local file:', absolutePath);
      }
    } catch (err) {
      console.error('Local file delete failed:', err);
    }
  } else {
    const publicId = getPublicId(url);
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log('Successfully deleted Cloudinary file:', publicId);
    } catch (err) {
      console.error('Cloudinary delete failed:', err);
    }
  }
};

module.exports = { deleteFromCloudinary };