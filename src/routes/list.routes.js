const express = require('express');
const { sendMessageCtrl, getChatHistoryCtrl, getChatListCtrl, markAsSeenCtrl } = require('../controllers/chat.controller');
const { protect } = require('../middlewares/auth.middleware');
const { listCityCtrl, listSkillCtrl, listInterestCtrl } = require('../controllers/list.controller');

const router = express.Router();

router.use(protect);

router.get('/city', listCityCtrl);
router.get('/skill', listSkillCtrl);
router.get('/interest', listInterestCtrl);

module.exports = router;