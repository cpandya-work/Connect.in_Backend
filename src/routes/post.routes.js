const express = require('express');
const {
  createPost,
  getPosts,
  getPostById,
  reactToPost,
  incrementPostView,
  getLinkPreview,
  resharePost,
  getTopSharers,
  getMostSharedReels,
  updatePost,
  deletePost,
  addPostComment,
  likePostComment,
  replyPostComment,
  rateAiAnswer
} = require('../controllers/post.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/postUpload.middleware');

const router = express.Router();

// Public / Optional Auth routes (All questions publicly readable)
router.get('/', optionalAuth, getPosts);
router.get('/top-sharers', optionalAuth, getTopSharers);
router.get('/most-shared', optionalAuth, getMostSharedReels);
router.get('/link-preview', optionalAuth, getLinkPreview);
router.get('/:postId', optionalAuth, getPostById);
router.post('/:postId/view', optionalAuth, incrementPostView);

// Protected routes (Login required to create, react, comment, reply, rate, edit, delete)
router.post('/', protect, upload.array('attachments', 5), createPost);
router.post('/:postId/react', protect, reactToPost);
router.post('/:postId/comment', protect, addPostComment);
router.post('/:postId/comment/:commentId/like', protect, likePostComment);
router.post('/:postId/comment/:commentId/reply', protect, replyPostComment);
router.post('/:postId/ai-helpful', protect, rateAiAnswer);
router.post('/:postId/reshare', protect, resharePost);
router.put('/:postId', protect, upload.array('attachments', 5), updatePost);
router.delete('/:postId', protect, deletePost);

module.exports = router;
