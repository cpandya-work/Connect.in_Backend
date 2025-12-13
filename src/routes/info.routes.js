const express = require('express');
const {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
} = require('../controllers/info.controller');

const router = express.Router();

router.get('/privacy-policy', getPrivacyPolicyCtrl);
router.get('/terms-conditions', getTermsAndConditionsCtrl);
router.get('/contact', getContactInfoCtrl);

module.exports = router;