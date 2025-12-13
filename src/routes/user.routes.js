const express = require('express');
const {
  getProfile,
  createProfile,
  getUserProfileById,
  updateUserProfile,
  deleteUserAccount,
} = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.post('/profile', upload.single('profileImage'), createProfile);
router.put('/profile', upload.single('profileImage'), updateUserProfile);
router.delete('/account', deleteUserAccount);
router.get('/profile/:id', getUserProfileById);

module.exports = router;