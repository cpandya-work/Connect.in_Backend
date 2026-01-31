const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getPrivacyPolicy, getTermsAndConditions, getContactInfo, submitInquiry, getInquiriesList, exportInquiriesToCSV } = require('../services/info.service');
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

/**
 * Get all inquiries (Admin only)
 */
const getInquiriesListCtrl = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  
  const result = await getInquiriesList({ page, limit, search, status });
  success(res, result, 'Inquiries fetched successfully');
});

/**
 * Export inquiries to CSV (Admin only)
 */
const exportInquiriesToCSVCtrl = asyncHandler(async (req, res) => {
  const { search = '', status = '' } = req.query;
  
  const result = await exportInquiriesToCSV({ search, status });
  
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="inquiries_${new Date().toISOString().split('T')[0]}.csv"`);
  
  res.send(result.csvContent);
});

module.exports = {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
  submitInquiryCtrl,
  getInquiriesListCtrl,
  exportInquiriesToCSVCtrl,
};