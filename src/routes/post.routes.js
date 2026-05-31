const express = require('express');
const { createPost, getPosts, reactToPost } = require('../controllers/post.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/postUpload.middleware');

const router = express.Router();

router.use(protect);

router.post('/', upload.array('attachments', 5), createPost);
router.get('/', getPosts);
router.post('/:postId/react', reactToPost);

module.exports = router;
