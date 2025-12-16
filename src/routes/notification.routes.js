const express = require('express');
const {
  getNotificationsCtrl,
  markAsReadCtrl,
  getUnreadCountCtrl,
} = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', getNotificationsCtrl);
router.get('/unread-count', getUnreadCountCtrl);
router.put('/:notificationId/read', markAsReadCtrl);

module.exports = router;