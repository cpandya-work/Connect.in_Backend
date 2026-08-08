const express = require('express');
const { getFeedCtrl, getFeedWebCtrl, getBusinessFeedCtrl } = require('../controllers/feed.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', getFeedCtrl);
router.get('/web', getFeedWebCtrl);
router.get('/businesses', getBusinessFeedCtrl);

module.exports = router;