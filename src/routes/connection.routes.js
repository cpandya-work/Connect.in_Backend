const express = require('express');
const {
  likeUserCtrl,
  dislikeUserCtrl,
  getLikesCtrl,
  getWhoLikedMeCtrl,
  sendRequestCtrl,
  getSentRequestsCtrl,
  getReceivedRequestsCtrl,
  getConnectionsCtrl,
  acceptRequestCtrl,
  rejectRequestCtrl,
  removeConnectionCtrl,
  skipUserCtrl,
  getSkippedUsersCtrl,
  unskipUserCtrl,
} = require('../controllers/connection.controller');
const {
  createGroupCtrl,
  getGroupsCtrl,
  getGroupByIdCtrl,
  updateGroupCtrl,
  deleteGroupCtrl,
} = require('../controllers/connectionGroup.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Group management routes
router.post('/groups', createGroupCtrl);
router.get('/groups', getGroupsCtrl);
router.get('/groups/:groupId', getGroupByIdCtrl);
router.put('/groups/:groupId', updateGroupCtrl);
router.delete('/groups/:groupId', deleteGroupCtrl);

router.post('/like/:likedUserId', likeUserCtrl);
router.delete('/like/:likedUserId', dislikeUserCtrl);
router.get('/likes', getLikesCtrl);
router.get('/who-liked-me', getWhoLikedMeCtrl);

router.post('/connectionrequest/:receiverId', sendRequestCtrl);
router.get('/requests/sent', getSentRequestsCtrl);
router.get('/requests/received', getReceivedRequestsCtrl);
router.get('/connections', getConnectionsCtrl);

router.post('/requests/:requestId/accept', acceptRequestCtrl);
router.delete('/requests/:requestId/reject', rejectRequestCtrl);

router.delete('/connection/:connectionUserId', removeConnectionCtrl);

router.post('/skip/:skippedUserId', skipUserCtrl);
router.get('/skips', getSkippedUsersCtrl);
router.delete('/skip/:skippedUserId', unskipUserCtrl);

module.exports = router;