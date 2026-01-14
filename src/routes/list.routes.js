const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { listCityCtrl, listSkillCtrl, listInterestCtrl, listHabitsCtrl, listCompaniesCtrl, listIndustriesCtrl } = require('../controllers/list.controller');

const router = express.Router();

router.use(protect);

router.get('/city', listCityCtrl);
router.get('/skill', listSkillCtrl);
router.get('/interest', listInterestCtrl);
router.get('/habits', listHabitsCtrl);
router.get('/companies', listCompaniesCtrl);
router.get('/industries', listIndustriesCtrl);




module.exports = router;