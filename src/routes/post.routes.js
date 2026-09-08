const express = require('express');
const { createPost, getPosts, reactToPost, getLinkPreview, resharePost, getTopSharers, getMostSharedReels, updatePost, deletePost } = require('../controllers/post.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/postUpload.middleware');

const router = express.Router();

router.use(protect);

router.post('/', upload.array('attachments', 5), createPost);
router.get('/', getPosts);
router.get('/top-sharers', getTopSharers);
router.get('/most-shared', getMostSharedReels);
router.get('/link-preview', getLinkPreview);
router.post('/:postId/react', reactToPost);
router.post('/:postId/reshare', resharePost);
router.put('/:postId', upload.array('attachments', 5), updatePost);
router.delete('/:postId', deletePost);

module.exports = router;
