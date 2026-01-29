const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getPrivacyPolicy, getTermsAndConditions, getContactInfo, submitInquiry } = require('../services/info.service');
const { inquirySchema } = require('../validators/inquiry.validator');

const getPrivacyPolicyCtrl = asyncHandler(async (req, res) => {
  const policy = await getPrivacyPolicy();
  success(res, policy);
});

const getTermsAndConditionsCtrl = asyncHandler(async (req, res) => {
  const terms = await getTermsAndConditions();
  success(res, terms);
});

const getContactInfoCtrl = asyncHandler(async (req, res) => {
  const contact = await getContactInfo();
  success(res, contact);
});

const submitInquiryCtrl = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = inquirySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }

  // Get userId from authenticated user if available (optional - inquiry can be submitted without login)
  const userId = req.user ? req.user._id : null;

  const inquiry = await submitInquiry(req.body, userId);
  success(res, { inquiry }, 'Inquiry submitted successfully');
});

module.exports = {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
  submitInquiryCtrl,
};