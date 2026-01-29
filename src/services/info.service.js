const getPrivacyPolicy = async () => {
  return {
    title: "Privacy Policy",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  };
};

const getTermsAndConditions = async () => {
  return {
    title: "Terms & Conditions",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  };
};

const Inquiry = require('../models/Inquiry.model');

const getContactInfo = async () => {
  return {
    email: "support@connectin.com",
    phone: "+91 98765 43210",
    address: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
  };
};

const submitInquiry = async (inquiryData, userId = null) => {
  const inquiry = await Inquiry.create({
    ...inquiryData,
    userId: userId || null,
  });
  return inquiry;
};

module.exports = { getPrivacyPolicy, getTermsAndConditions, getContactInfo, submitInquiry };