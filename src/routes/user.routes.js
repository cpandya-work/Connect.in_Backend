const express = require('express');
const {
  getProfile,
  createProfile,
  getUserProfileById,
  updateUserProfile,
  deleteUserAccount,
  saveProfileStep,
  getProfileProgress,
} = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Public route - createProfile doesn't require authentication
router.post('/profile', upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), createProfile);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.get('/profile/progress', getProfileProgress);
router.post('/profile/step', upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), saveProfileStep);
router.put('/profile', upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), updateUserProfile);
router.delete('/account', deleteUserAccount);
router.get('/profile/:id', getUserProfileById);

module.exports = router;