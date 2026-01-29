const express = require('express');
const {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
  submitInquiryCtrl,
} = require('../controllers/info.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/privacy-policy', getPrivacyPolicyCtrl);
router.get('/terms-conditions', getTermsAndConditionsCtrl);
router.get('/contact', getContactInfoCtrl);

// Inquiry form - optional authentication (can submit with or without login)
router.post('/inquiry', optionalAuth, submitInquiryCtrl);

module.exports = router;