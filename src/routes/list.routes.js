const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { listCityCtrl, listSkillCtrl, listInterestCtrl, listHabitsCtrl, listCompaniesCtrl, listIndustriesCtrl, listCardsCtrl, listAuthBannersCtrl, listSportCtrl, listPositionsCtrl, getPopupOfferCtrl, clickCardCtrl, listBusinessCategoriesCtrl, listOfferCategoriesCtrl } = require('../controllers/list.controller');

const router = express.Router();

// Public routes — no auth needed for reference lists
router.get('/auth-banners', listAuthBannersCtrl);
router.get('/city', listCityCtrl);
router.get('/industries', listIndustriesCtrl);
router.get('/companies', listCompaniesCtrl);
router.get('/positions', listPositionsCtrl);
router.get('/position', listPositionsCtrl);
router.get('/business-categories', listBusinessCategoriesCtrl);

router.use(protect);

router.get('/skill', listSkillCtrl);
router.get('/interest', listInterestCtrl);
router.get('/habits', listHabitsCtrl);
router.get('/cards', listCardsCtrl);
router.post('/cards/:id/click', clickCardCtrl);
router.get('/popup-offer', getPopupOfferCtrl);
router.get('/sport', listSportCtrl);
router.get('/offer-categories', listOfferCategoriesCtrl);

module.exports = router;