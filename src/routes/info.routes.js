const express = require('express');
const {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
  submitInquiryCtrl,
  getInquiriesListCtrl,
  exportInquiriesToCSVCtrl,
} = require('../controllers/info.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

const router = express.Router();

router.get('/privacy-policy', getPrivacyPolicyCtrl);
router.get('/terms-conditions', getTermsAndConditionsCtrl);
router.get('/contact', getContactInfoCtrl);

// Inquiry form - optional authentication (can submit with or without login)
router.post('/inquiry', optionalAuth, submitInquiryCtrl);

// Admin routes for inquiries - require admin authentication
router.get('/inquiries', isAdmin, getInquiriesListCtrl);
router.get('/inquiries/export', isAdmin, exportInquiriesToCSVCtrl);

module.exports = router;