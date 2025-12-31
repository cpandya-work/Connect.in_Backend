const express = require('express');
const { getFeedCtrl, getFeedWebCtrl } = require('../controllers/feed.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', getFeedCtrl);
router.get('/web', getFeedWebCtrl);

module.exports = router;