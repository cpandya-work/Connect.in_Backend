const express = require('express');
const {
  likeUserCtrl,
  getLikesCtrl,
  getWhoLikedMeCtrl,
  sendRequestCtrl,
  getSentRequestsCtrl,
  getReceivedRequestsCtrl,
  getConnectionsCtrl,
  acceptRequestCtrl,
  rejectRequestCtrl,
} = require('../controllers/connection.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/like/:likedUserId', likeUserCtrl);
router.get('/likes', getLikesCtrl);
router.get('/who-liked-me', getWhoLikedMeCtrl);

router.post('/connectionrequest/:receiverId', sendRequestCtrl);
router.get('/requests/sent', getSentRequestsCtrl);
router.get('/requests/received', getReceivedRequestsCtrl);
router.get('/connections', getConnectionsCtrl);

router.post('/requests/:requestId/accept', acceptRequestCtrl);
router.delete('/requests/:requestId/reject', rejectRequestCtrl);

module.exports = router;