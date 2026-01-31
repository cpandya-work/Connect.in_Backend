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

/**
 * Get all inquiries with pagination and search (Admin only)
 */
const getInquiriesList = async ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
    ];
  }

  // Filter by status
  if (status && status.trim()) {
    query.status = status.trim();
  }

  // Get total count
  const total = await Inquiry.countDocuments(query);

  // Get inquiries with pagination, sorted by newest first
  const inquiries = await Inquiry.find(query)
    .populate('userId', 'phoneNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  return {
    inquiries,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalCount: total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };
};

/**
 * Export inquiries to CSV format (Admin only)
 */
const exportInquiriesToCSV = async ({ search = '', status = '' } = {}) => {
  // Build search query
  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
    ];
  }

  // Filter by status
  if (status && status.trim()) {
    query.status = status.trim();
  }

  // Get all inquiries matching the query
  const inquiries = await Inquiry.find(query)
    .populate('userId', 'phoneNumber')
    .sort({ createdAt: -1 })
    .lean();

  // Convert to CSV format
  const csvHeaders = ['Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Created At', 'User ID'];
  const csvRows = inquiries.map(inquiry => {
    return [
      `"${(inquiry.name || '').replace(/"/g, '""')}"`,
      `"${(inquiry.email || '').replace(/"/g, '""')}"`,
      `"${(inquiry.phone || '').replace(/"/g, '""')}"`,
      `"${(inquiry.subject || '').replace(/"/g, '""')}"`,
      `"${(inquiry.message || '').replace(/"/g, '""')}"`,
      `"${(inquiry.status || 'pending').replace(/"/g, '""')}"`,
      `"${inquiry.createdAt ? new Date(inquiry.createdAt).toISOString() : ''}"`,
      `"${inquiry.userId ? (inquiry.userId._id || inquiry.userId) : ''}"`,
    ].join(',');
  });

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows
  ].join('\n');

  return {
    csvContent,
    totalCount: inquiries.length,
  };
};

module.exports = { 
  getPrivacyPolicy, 
  getTermsAndConditions, 
  getContactInfo, 
  submitInquiry,
  getInquiriesList,
  exportInquiriesToCSV
};