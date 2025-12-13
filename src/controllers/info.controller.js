const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getPrivacyPolicy, getTermsAndConditions, getContactInfo } = require('../services/info.service');

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

module.exports = {
  getPrivacyPolicyCtrl,
  getTermsAndConditionsCtrl,
  getContactInfoCtrl,
};