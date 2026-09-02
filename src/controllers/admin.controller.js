const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const {
  getPositionsList,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  getTrafficSourcesStats,
  getTrafficSourceTrend,
  getUsersList,
  getSkillsList,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillById,
  getSportsList,
  createSport,
  updateSport,
  deleteSport,
  getSportById,
  getInterestsList,
  createInterest,
  updateInterest,
  deleteInterest,
  getInterestById,
  getCitiesList,
  createCity,
  updateCity,
  deleteCity,
  getCityById,
  getHabitsList,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitById,
  getCompaniesList,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyById,
  getIndustriesList,
  createIndustry,
  updateIndustry,
  deleteIndustry,
  getIndustryById,
  getCardsList,
  createCard,
  updateCard,
  deleteCard,
  getCardById,
  getAuthBanners,
  createAuthBanner,
  deleteAuthBanner,
  toggleAuthBanner,
  broadcastOfferEmail,
  getIncompleteProfileUsersCount,
  getIncompleteProfileUsers,
  getUsersCountByRegistration,
  getUsersByRegistration,
  getEmailUsersCountByRegistration,
  getEmailUsersByRegistration,
  getDashboardStats,
  getStatsTrend,
} = require('../services/admin.service');
const { createSkillSchema, updateSkillSchema } = require('../validators/skill.validator');
const { createPositionSchema, updatePositionSchema } = require('../validators/position.validator');
const { createSportSchema, updateSportSchema } = require('../validators/sport.validator');
const { createInterestSchema, updateInterestSchema } = require('../validators/interest.validator');
const { createCitySchema, updateCitySchema } = require('../validators/city.validator');
const { createHabitSchema, updateHabitSchema } = require('../validators/habit.validator');
const { createCompanySchema, updateCompanySchema } = require('../validators/company.validator');
const { createIndustrySchema, updateIndustrySchema } = require('../validators/industry.validator');
const { createCardSchema, updateCardSchema } = require('../validators/card.validator');
const {
  broadcastNotificationSchema,
  generalSmsBroadcastSchema,
  targetedEmailBroadcastSchema,
  testScheduledMailerSchema
} = require('../validators/broadcast.validator');
const { sendBroadcastNotification } = require('../services/notification.service');
// const { sendBulkSms } = require('../services/sms.service');
const { sendBulkHtmlEmail } = require('../services/email.service');
const Setting = require('../models/Setting.model');
const CardClick = require('../models/CardClick.model');
const Card = require('../models/Card.model');
const mongoose = require('mongoose');

const getPopupSettingCtrl = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: 'isPopupEnabled' });
  const isPopupEnabled = setting ? setting.value : true; // default to true
  success(res, { isPopupEnabled }, 'Popup setting retrieved successfully');
});

const updatePopupSettingCtrl = asyncHandler(async (req, res) => {
  const { isPopupEnabled } = req.body;
  if (isPopupEnabled === undefined) {
    return res.status(400).json({ success: false, message: 'isPopupEnabled is required' });
  }
  const setting = await Setting.findOneAndUpdate(
    { key: 'isPopupEnabled' },
    { value: !!isPopupEnabled },
    { new: true, upsert: true }
  );
  success(res, { isPopupEnabled: setting.value }, 'Popup setting updated successfully');
});

/**
 * Get paginated list of users with search
 * Query params: page, limit, search
 */
const getUsersListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, city, industry, interest, religion, isBusiness } = req.query;

  const result = await getUsersList({
    page,
    limit,
    search,
    city,
    industry,
    interest,
    religion,
    isBusiness,
  });

  success(res, result, 'Users retrieved successfully');
});

/**
 * Get paginated list of skills with search
 * Query params: page, limit, search, isActive
 */
const getSkillsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getSkillsList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Skills retrieved successfully');
});

/**
 * Get a single skill by ID
 */
const getSkillByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skill = await getSkillById(id);
  success(res, { skill }, 'Skill retrieved successfully');
});

/**
 * Create a new skill
 */
const createSkillCtrl = asyncHandler(async (req, res) => {
  const { error } = createSkillSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const skill = await createSkill(req.body);
  success(res, { skill }, 'Skill created successfully');
});

/**
 * Update a skill by ID
 */
const updateSkillCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateSkillSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const skill = await updateSkill(id, req.body);
  success(res, { skill }, 'Skill updated successfully');
});

/**
 * Delete a skill by ID
 */
const deleteSkillCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteSkill(id);
  success(res, null, 'Skill deleted successfully');
});

/**
 * Get paginated list of interests with search
 * Query params: page, limit, search, isActive
 */
const getInterestsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getInterestsList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Interests retrieved successfully');
});

/**
 * Get a single interest by ID
 */
const getInterestByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const interest = await getInterestById(id);
  success(res, { interest }, 'Interest retrieved successfully');
});

/**
 * Create a new interest
 */
const createInterestCtrl = asyncHandler(async (req, res) => {
  console.log(req.body, 'body');

  const { error } = createInterestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const interest = await createInterest(req.body);
  success(res, { interest }, 'Interest created successfully');
});

/**
 * Update an interest by ID
 */
const updateInterestCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateInterestSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const interest = await updateInterest(id, req.body);
  success(res, { interest }, 'Interest updated successfully');
});

/**
 * Delete an interest by ID
 */
const deleteInterestCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteInterest(id);
  success(res, null, 'Interest deleted successfully');
});

/**
 * Get paginated list of cities with search
 * Query params: page, limit, search, isActive
 */
const getCitiesListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getCitiesList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Cities retrieved successfully');
});

/**
 * Get a single city by ID
 */
const getCityByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const city = await getCityById(id);
  success(res, { city }, 'City retrieved successfully');
});

/**
 * Create a new city
 */
const createCityCtrl = asyncHandler(async (req, res) => {
  const { error } = createCitySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const city = await createCity(req.body);
  success(res, { city }, 'City created successfully');
});

/**
 * Update a city by ID
 */
const updateCityCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateCitySchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const city = await updateCity(id, req.body);
  success(res, { city }, 'City updated successfully');
});

/**
 * Delete a city by ID
 */
const deleteCityCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteCity(id);
  success(res, null, 'City deleted successfully');
});

/**
 * Get paginated list of habits with search
 * Query params: page, limit, search, isActive
 */
const getHabitsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getHabitsList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Habits retrieved successfully');
});

/**
 * Get a single habit by ID
 */
const getHabitByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const habit = await getHabitById(id);
  success(res, { habit }, 'Habit retrieved successfully');
});

/**
 * Create a new habit
 */
const createHabitCtrl = asyncHandler(async (req, res) => {
  const { error } = createHabitSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const habit = await createHabit(req.body);
  success(res, { habit }, 'Habit created successfully');
});

/**
 * Update a habit by ID
 */
const updateHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateHabitSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const habit = await updateHabit(id, req.body);
  success(res, { habit }, 'Habit updated successfully');
});

/**
 * Delete a habit by ID
 */
const deleteHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteHabit(id);
  success(res, null, 'Habit deleted successfully');
});

/**
 * Get paginated list of companies with search
 * Query params: page, limit, search, isActive, industry (for filtering)
 * Note: Industry data is always populated and included in the response for each company
 */
const getCompaniesListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive, industry } = req.query;

  const result = await getCompaniesList({
    page,
    limit,
    search,
    isActive,
    industry,
  });

  // Industry is automatically populated in the service layer
  success(res, result, 'Companies retrieved successfully');
});

/**
 * Get a single company by ID
 */
const getCompanyByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await getCompanyById(id);
  success(res, { company }, 'Company retrieved successfully');
});

/**
 * Create a new company
 */
const createCompanyCtrl = asyncHandler(async (req, res) => {
  const { error } = createCompanySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const company = await createCompany(req.body);
  success(res, { company }, 'Company created successfully');
});

/**
 * Update a company by ID
 */
const updateCompanyCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateCompanySchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const company = await updateCompany(id, req.body);
  success(res, { company }, 'Company updated successfully');
});

/**
 * Delete a company by ID
 */
const deleteCompanyCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteCompany(id);
  success(res, null, 'Company deleted successfully');
});

/**
 * Get paginated list of industries with search
 * Query params: page, limit, search, isActive
 */
const getIndustriesListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getIndustriesList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Industries retrieved successfully');
});

/**
 * Get a single industry by ID
 */
const getIndustryByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const industry = await getIndustryById(id);
  success(res, { industry }, 'Industry retrieved successfully');
});

/**
 * Create a new industry
 */
const createIndustryCtrl = asyncHandler(async (req, res) => {
  const { error } = createIndustrySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const industry = await createIndustry(req.body);
  success(res, { industry }, 'Industry created successfully');
});

/**
 * Update an industry by ID
 */
const updateIndustryCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateIndustrySchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const industry = await updateIndustry(id, req.body);
  success(res, { industry }, 'Industry updated successfully');
});

/**
 * Delete an industry by ID
 */
const deleteIndustryCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteIndustry(id);
  success(res, null, 'Industry deleted successfully');
});

/**
 * Get paginated list of cards with search
 * Query params: page, limit, search, isActive
 */
const getCardsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive, category } = req.query;

  const result = await getCardsList({
    page,
    limit,
    search,
    isActive,
    category,
  });

  success(res, result, 'Cards retrieved successfully');
});

/**
 * Get a single card by ID
 */
const getCardByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const card = await getCardById(id);
  success(res, { card }, 'Card retrieved successfully');
});

/**
 * Parse array field from form-data (can be JSON string, comma-separated, or array)
 * Used for features, eligibles, etc.
 */
const parseArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If not JSON, try comma-separated values
      if (field.includes(',')) {
        return field.split(',').map(f => f.trim()).filter(f => f.length > 0);
      }
      // Single value
      return [field.trim()].filter(f => f.length > 0);
    }
  }
  return [];
};

/**
 * Create a new card
 * Requires image upload - image is uploaded to Cloudinary and URL is saved automatically
 */
const createCardCtrl = asyncHandler(async (req, res) => {
  const logoFile = req.files && req.files['logo_image'] ? req.files['logo_image'][0] : null;
  const offerFile = req.files && req.files['offer_image'] ? req.files['offer_image'][0] : null;

  // Image file is required for card creation
  if (!logoFile || !logoFile.path) {
    return res.status(400).json({
      success: false,
      message: 'Logo image is required. Please upload an image file.'
    });
  }

  // Parse features and eligibles from form-data (checking both array format and plain formats)
  const features = parseArrayField(req.body.features || req.body['features[]']);
  const eligibles = parseArrayField(req.body.eligibles || req.body['eligibles[]']);
  const targetCities = parseArrayField(req.body.targetCities || req.body['targetCities[]']);
  const targetPositions = parseArrayField(req.body.targetPositions || req.body['targetPositions[]']);

  // Use the Cloudinary URL from the uploaded file
  const cardData = {
    ...req.body,
    logo_image: logoFile.path, // Cloudinary URL
    offer_image: offerFile ? offerFile.path : null, // Cloudinary URL
    features: features, // Parsed array
    eligibles: eligibles, // Parsed array
    targetCities: targetCities,
    targetPositions: targetPositions,
    targetAgeMin: req.body.targetAgeMin !== undefined && req.body.targetAgeMin !== '' && req.body.targetAgeMin !== 'null' ? parseInt(req.body.targetAgeMin, 10) : null,
    targetAgeMax: req.body.targetAgeMax !== undefined && req.body.targetAgeMax !== '' && req.body.targetAgeMax !== 'null' ? parseInt(req.body.targetAgeMax, 10) : null,
  };

  const { error } = createCardSchema.validate(cardData);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const card = await createCard(cardData);
  success(res, { card }, 'Card created successfully');
});

/**
 * Update a card by ID
 * Supports both direct image upload and URL update
 */
const updateCardCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // If file is uploaded, use file path; otherwise use logo_image/offer_image from body
  const updateData = { ...req.body };
  const logoFile = req.files && req.files['logo_image'] ? req.files['logo_image'][0] : null;
  const offerFile = req.files && req.files['offer_image'] ? req.files['offer_image'][0] : null;

  if (logoFile && logoFile.path) {
    updateData.logo_image = logoFile.path;
  }
  if (offerFile && offerFile.path) {
    updateData.offer_image = offerFile.path;
  }

  // Parse array fields if provided
  updateData.features = parseArrayField(updateData.features || updateData['features[]']);
  updateData.eligibles = parseArrayField(updateData.eligibles || updateData['eligibles[]']);
  updateData.targetCities = parseArrayField(updateData.targetCities || updateData['targetCities[]']);
  updateData.targetPositions = parseArrayField(updateData.targetPositions || updateData['targetPositions[]']);

  if (updateData.targetAgeMin !== undefined) {
    updateData.targetAgeMin = updateData.targetAgeMin !== '' && updateData.targetAgeMin !== 'null' && updateData.targetAgeMin !== null ? parseInt(updateData.targetAgeMin, 10) : null;
  }
  if (updateData.targetAgeMax !== undefined) {
    updateData.targetAgeMax = updateData.targetAgeMax !== '' && updateData.targetAgeMax !== 'null' && updateData.targetAgeMax !== null ? parseInt(updateData.targetAgeMax, 10) : null;
  }

  const { error } = updateCardSchema.validate(updateData);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const card = await updateCard(id, updateData, req.files);
  success(res, { card }, 'Card updated successfully');
});

/**
 * Delete a card by ID
 */
const deleteCardCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteCard(id);
  success(res, null, 'Card deleted successfully');
});

/**
 * Get all users who clicked on a specific card
 */
const getCardClicksCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid Card ID' });
  }

  const card = await Card.findById(id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  const matchQuery = { cardId: new mongoose.Types.ObjectId(id) };
  if (days && days !== 'all') {
    const numDays = parseInt(days, 10);
    if (!isNaN(numDays)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - numDays);
      matchQuery.createdAt = { $gte: cutoffDate };
    }
  }

  const clicks = await CardClick.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$userId",
        clickCount: { $sum: 1 },
        lastClickedAt: { $max: "$createdAt" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "userdetails",
        localField: "user.userDetailId",
        foreignField: "_id",
        as: "userDetail"
      }
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        clickCount: 1,
        lastClickedAt: 1,
        mobile: "$user.phoneNumber",
        email: "$userDetail.email",
        fullName: "$userDetail.fullName"
      }
    },
    { $sort: { clickCount: -1 } }
  ]);

  success(res, { card, clicks }, 'Card clicks retrieved successfully');
});

/**
 * Send an email broadcast to all users who clicked on a card
 */
const broadcastCardMailerCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, htmlContent, days } = req.body;

  if (!subject || !htmlContent) {
    return res.status(400).json({ success: false, message: 'Subject and content are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid Card ID' });
  }

  const card = await Card.findById(id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  const matchQuery = { cardId: new mongoose.Types.ObjectId(id) };
  if (days && days !== 'all') {
    const numDays = parseInt(days, 10);
    if (!isNaN(numDays)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - numDays);
      matchQuery.createdAt = { $gte: cutoffDate };
    }
  }

  // Find all unique users who clicked this card
  const clicks = await CardClick.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$userId"
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "userdetails",
        localField: "user.userDetailId",
        foreignField: "_id",
        as: "userDetail"
      }
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        email: "$userDetail.email",
        fullName: "$userDetail.fullName"
      }
    }
  ]);

  // Filter out any entries without emails
  const recipients = clicks
    .map(c => ({
      email: c.email,
      fullName: c.fullName
    }))
    .filter(r => !!r.email);

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No users with emails found who clicked this offer' });
  }

  // Send bulk emails using the helper function
  const result = await sendBulkHtmlEmail(recipients, subject, htmlContent);

  success(res, { sent: result.sent, skipped: result.skipped }, 'Broadcast mailer sent successfully');
});

/**
 * Get count of unique users who clicked on any card in the last N days
 */
const broadcastAllCardsMailerCountCtrl = asyncHandler(async (req, res) => {
  const { days = 15 } = req.query;
  const matchQuery = {};
  const numDays = parseInt(days, 10);
  if (!isNaN(numDays)) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    matchQuery.createdAt = { $gte: cutoffDate };
  }

  const clicks = await CardClick.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$userId"
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "userdetails",
        localField: "user.userDetailId",
        foreignField: "_id",
        as: "userDetail"
      }
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        email: "$userDetail.email"
      }
    }
  ]);

  const count = clicks.filter(c => !!c.email).length;
  success(res, { count }, 'Targeted clickers count retrieved successfully');
});

/**
 * Send bulk email to all users who clicked on any card in the last N days
 */
const broadcastAllCardsMailerCtrl = asyncHandler(async (req, res) => {
  const { subject, htmlContent, days = 15 } = req.body;

  if (!subject || !htmlContent) {
    return res.status(400).json({ success: false, message: 'Subject and content are required' });
  }

  const matchQuery = {};
  const numDays = parseInt(days, 10);
  if (!isNaN(numDays)) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    matchQuery.createdAt = { $gte: cutoffDate };
  }

  // Find all unique users who clicked any card
  const clicks = await CardClick.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$userId"
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "userdetails",
        localField: "user.userDetailId",
        foreignField: "_id",
        as: "userDetail"
      }
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        email: "$userDetail.email",
        fullName: "$userDetail.fullName"
      }
    }
  ]);

  // Filter out any entries without emails
  const recipients = clicks
    .map(c => ({
      email: c.email,
      fullName: c.fullName
    }))
    .filter(r => !!r.email);

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No users with emails found who clicked any offer' });
  }

  // Send bulk emails using the helper function
  const result = await sendBulkHtmlEmail(recipients, subject, htmlContent);

  success(res, { sent: result.sent, skipped: result.skipped }, 'Broadcast mailer sent successfully');
});

/**
 * Send an SMS broadcast to all users who clicked on a card (DLT Template)
 */
const broadcastCardSmsCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid Card ID' });
  }

  const card = await Card.findById(id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  const matchQuery = { cardId: new mongoose.Types.ObjectId(id) };
  if (days && days !== 'all') {
    const numDays = parseInt(days, 10);
    if (!isNaN(numDays)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - numDays);
      matchQuery.createdAt = { $gte: cutoffDate };
    }
  }

  // Find all unique users who clicked this card
  const clicks = await CardClick.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$userId"
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "userdetails",
        localField: "user.userDetailId",
        foreignField: "_id",
        as: "userDetail"
      }
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        phoneNumber: "$user.phoneNumber",
        fullName: "$userDetail.fullName"
      }
    }
  ]);

  // Filter out any entries without phone numbers
  const recipients = clicks
    .map(c => ({
      phoneNumber: c.phoneNumber,
      fullName: c.fullName || 'User'
    }))
    .filter(r => !!r.phoneNumber);

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No users with phone numbers found who clicked this offer' });
  }

  const { sendCardOfferBulkSms } = require('../services/sms.service');

  // Trigger broadcast in background
  setImmediate(() => {
    sendCardOfferBulkSms(recipients, card.name, card._id).catch(err => {
      console.error('Error in sendCardOfferBulkSms:', err);
    });
  });

  success(res, { sent: recipients.length }, `SMS broadcast initiated to ${recipients.length} users`);
});

/**
 * Get all auth banners (admin)
 */
const getAuthBannersCtrl = asyncHandler(async (req, res) => {
  const banners = await getAuthBanners();
  success(res, { banners }, 'Auth banners retrieved successfully');
});

/**
 * Upload a new auth banner
 * Expects multipart/form-data with fields: image (file), type (desktop|mobile)
 */
const createAuthBannerCtrl = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required' });
  }
  const { type } = req.body;
  if (!type || !['desktop', 'mobile'].includes(type)) {
    return res.status(400).json({ success: false, message: 'type must be "desktop" or "mobile"' });
  }

  const imageUrl = req.file.path;
  const cloudinaryPublicId = req.file.filename;
  const width = req.file.width || null;
  const height = req.file.height || null;

  const banner = await createAuthBanner({ imageUrl, cloudinaryPublicId, type, width, height });
  success(res, { banner }, 'Auth banner uploaded successfully');
});

/**
 * Delete an auth banner by ID (also removes from Cloudinary)
 */
const deleteAuthBannerCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteAuthBanner(id);
  success(res, null, 'Auth banner deleted successfully');
});

/**
 * Toggle isActive status of an auth banner
 */
const toggleAuthBannerCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await toggleAuthBanner(id);
  success(res, { banner }, 'Auth banner status updated');
});

/**
 * Send broadcast offer email to all users who have an email address
 * Body: { title, description }
 */
const broadcastOfferEmailCtrl = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'title and description are required' });
  }
  const result = await broadcastOfferEmail(title, description);
  success(res, result, `Offer email sent to ${result.sent} users`);
});

/**
 * Send push notification to all users (broadcast)
 * Requires title and description
 */
const sendBroadcastNotificationCtrl = asyncHandler(async (req, res) => {
  const { error } = broadcastNotificationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { title, description } = req.body;

  const result = await sendBroadcastNotification(title, description);

  success(res, result, 'Broadcast notification sent successfully');
});

/**
 * Get count of users with incomplete profiles
 * Query: days (7, 15, 30, 45, all)
 */
const getIncompleteProfileCountCtrl = asyncHandler(async (req, res) => {
  const { days = 'all' } = req.query;
  const count = await getIncompleteProfileUsersCount(days);
  success(res, { count }, 'Incomplete profile count retrieved');
});

/**
 * Download CSV of users with incomplete profiles
 * Query: days (7, 15, 30, 45, all)
 */
const downloadIncompleteProfilesCSVCtrl = asyncHandler(async (req, res) => {
  const { days = 'all' } = req.query;
  const users = await getIncompleteProfileUsers(days);

  const csvRows = ['mobile,name'];
  for (const user of users) {
    const mobile = user.phoneNumber || '';
    const name = user.fullName || 'User';

    // Escape double quotes and wrap in double quotes
    const escapedMobile = `"${mobile.replace(/"/g, '""')}"`;
    const escapedName = `"${name.replace(/"/g, '""')}"`;

    csvRows.push(`${escapedMobile},${escapedName}`);
  }
  const csvContent = csvRows.join('\n');

  const filename = `incomplete_profiles_${days}_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

/**
 * Send SMS to users with incomplete profiles
 * Body: { days, message }
 */
const sendIncompleteProfileSmsCtrl = asyncHandler(async (req, res) => {
  const { days = 'all' } = req.body;

  const users = await getIncompleteProfileUsers(days);

  if (users.length === 0) {
    return res.status(200).json({ success: true, message: 'No users found matching the criteria' });
  }

  const { sendIncompleteProfileBulkSms } = require('../services/sms.service');

  // Trigger broadcast in background
  setImmediate(() => {
    sendIncompleteProfileBulkSms(users).catch(err => {
      console.error('Error in sendIncompleteProfileBulkSms:', err);
    });
  });

  success(res, { sent: users.length }, `SMS broadcast initiated to ${users.length} users`);
});

/**
 * Get count of all users filtered by registration duration
 * Query: days (7, 15, 30, 45, all)
 */
const getGeneralUserCountCtrl = asyncHandler(async (req, res) => {
  const { days = 'all' } = req.query;
  const count = await getUsersCountByRegistration(days);
  success(res, { count }, 'User count retrieved');
});

/**
 * Send SMS to all users filtered by registration duration
 * Body: { days, message, templateId }
 */
const sendGeneralSmsBroadcastCtrl = asyncHandler(async (req, res) => {
  const { error } = generalSmsBroadcastSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { days = 'all', message, templateId } = req.body;

  const users = await getUsersByRegistration(days);

  if (users.length === 0) {
    return res.status(200).json({ success: true, message: 'No users found matching the criteria' });
  }

  const { sendBulkSms } = require('../services/sms.service');

  // Trigger broadcast in background
  setImmediate(() => {
    sendBulkSms(users, message, templateId).catch(err => {
      console.error('Error in sendBulkSms:', err);
    });
  });

  success(res, { sent: users.length }, `SMS broadcast initiated to ${users.length} users`);
});

/**
 * Get count of users with email address filtered by registration duration
 * Query: days (7, 15, 30, 45, all)
 */
const getTargetedEmailUserCountCtrl = asyncHandler(async (req, res) => {
  const { days = 'all' } = req.query;
  const count = await getEmailUsersCountByRegistration(days);
  success(res, { count }, 'Targeted email user count retrieved');
});

/**
 * Send targeted HTML email to users filtered by registration duration
 * Body: { days, subject, htmlContent }
 */
const sendTargetedEmailBroadcastCtrl = asyncHandler(async (req, res) => {
  const { error } = targetedEmailBroadcastSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { days = 'all', subject, htmlContent } = req.body;

  const recipients = await getEmailUsersByRegistration(days);

  if (recipients.length === 0) {
    return res.status(200).json({ success: true, message: 'No users found matching the criteria' });
  }

  // Trigger email broadcast
  const result = await sendBulkHtmlEmail(recipients, subject, htmlContent);

  success(res, result, `Email broadcast initiated to ${result.sent} users`);
});

/**
 * Get core platform metrics snapshot for Admin Dashboard
 */
const getDashboardStatsCtrl = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  success(res, stats, 'Dashboard stats retrieved successfully');
});

const getTrafficSourcesStatsCtrl = asyncHandler(async (req, res) => {
  const stats = await getTrafficSourcesStats();
  success(res, stats, 'Traffic source stats retrieved successfully');
});

const getTrafficSourceTrendCtrl = asyncHandler(async (req, res) => {
  const { source } = req.query;
  const trend = await getTrafficSourceTrend(source);
  success(res, { trend }, 'Traffic source trend retrieved successfully');
});

const getStatsTrendCtrl = asyncHandler(async (req, res) => {
  const { statId } = req.query;
  if (!statId) {
    return res.status(400).json({ success: false, message: 'statId query parameter is required' });
  }
  const trend = await getStatsTrend(statId);
  success(res, { trend }, 'Stats trend retrieved successfully');
});


const getPendingPostsCtrl = asyncHandler(async (req, res) => {
  const Post = require('../models/Post.model');
  const posts = await Post.find({ isApproved: false })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage isBusinessProfile businessName businessLogo' },
      select: 'userDetailId'
    })
    .populate('authorCity')
    .populate('connectionGroupId', 'name')
    .populate({
      path: 'sharedPostId',
      populate: {
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage isBusinessProfile businessName businessLogo' },
        select: 'userDetailId'
      }
    })
    .sort({ createdAt: -1 })
    .lean();

  success(res, { posts }, 'Pending posts retrieved successfully');
});

const approvePostCtrl = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const Post = require('../models/Post.model');
  const User = require('../models/User.model');
  const UserConnections = require('../models/UserConnections.model');
  const { sendPostNotification } = require('../services/notification.service');
  const { sendNewPostEmail } = require('../services/email.service');

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  if (req.body.targetSegments) {
    const { connections, city, industries, interests, ageGroups } = req.body.targetSegments;
    if (typeof connections === 'boolean') post.targetSegments.connections = connections;
    if (typeof city === 'boolean') post.targetSegments.city = city;
    if (Array.isArray(industries)) post.targetSegments.industries = industries;
    if (Array.isArray(interests)) post.targetSegments.interests = interests;
    if (Array.isArray(ageGroups)) post.targetSegments.ageGroups = ageGroups;
  }

  post.isApproved = true;
  await post.save();

  // Find connections to notify
  const userId = post.userId;
  const poster = await User.findById(userId).populate('userDetailId');
  const posterName = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessName : (poster?.userDetailId?.fullName || 'A user');
  const posterImage = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessLogo : (poster?.userDetailId?.profileImage || '');

  const connections = await UserConnections.find({
    $or: [
      { connection1Id: userId },
      { connection2Id: userId },
    ],
  });

  const connectionIds = connections.map(c =>
    c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
  );

  // Send notifications and emails (non-blocking)
  setImmediate(async () => {
    try {
      // Find all users except the poster
      const allUsers = await User.find({ _id: { $ne: userId } }).populate('userDetailId');

      // Helper to calculate age group (same as in post.controller.js)
      const getAgeGroup = (dateOfBirth) => {
        if (!dateOfBirth) return null;
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 20 && age <= 25) return '20-25';
        if (age >= 26 && age <= 35) return '26-35';
        if (age >= 36 && age <= 50) return '36-50';
        if (age >= 51 && age <= 65) return '51-65';
        if (age > 65) return '65+';
        return null;
      };

      const connections = await UserConnections.find({
        $or: [
          { connection1Id: userId },
          { connection2Id: userId },
        ],
      });

      const connectionIds = new Set(
        connections.map(c =>
          c.connection1Id.toString() === userId.toString() ? c.connection2Id.toString() : c.connection1Id.toString()
        )
      );

      // Fetch connection group members if it's a group post
      let groupMemberIds = new Set();
      if (post.connectionGroupId) {
        const ConnectionGroup = require('../models/ConnectionGroup.model');
        const group = await ConnectionGroup.findById(post.connectionGroupId);
        if (group) {
          groupMemberIds = new Set(group.connections.map(id => id.toString()));
        }
      }

      const notifyPromises = allUsers.map(async (user) => {
        const isConnection = connectionIds.has(user._id.toString());

        // Check if user matches post segments
        let shouldNotify = false;

        if (post.connectionGroupId) {
          shouldNotify = groupMemberIds.has(user._id.toString());
        } else {
          const segments = post.targetSegments;
          if (!segments) {
            shouldNotify = isConnection;
          } else {
            const { connections: targetConn, city: targetCity, industries: targetInd, interests: targetInt, ageGroups: targetAge } = segments;
            if (targetConn && isConnection) shouldNotify = true;
            else if (targetCity && post.authorCity && user.userDetailId?.city && user.userDetailId.city.toString() === post.authorCity.toString()) shouldNotify = true;
            else if (targetInd && targetInd.length > 0 && user.userDetailId?.industry && targetInd.includes(user.userDetailId.industry)) shouldNotify = true;
            else if (targetInt && targetInt.length > 0 && user.userDetailId?.interests && user.userDetailId.interests.some(i => targetInt.includes(i))) shouldNotify = true;
            else if (targetAge && targetAge.length > 0 && user.userDetailId?.dateOfBirth) {
              const ageGrp = getAgeGroup(user.userDetailId.dateOfBirth);
              if (ageGrp && targetAge.includes(ageGrp)) shouldNotify = true;
            } else if (!targetConn && !targetCity && (!targetInd || targetInd.length === 0) && (!targetInt || targetInt.length === 0) && (!targetAge || targetAge.length === 0)) {
              // Default to connections if no targets specified
              if (isConnection) shouldNotify = true;
            }
          }
        }

        if (shouldNotify) {
          // Send push notification
          sendPostNotification(user._id, posterName, userId, posterImage).catch(console.error);

          // Send email if user has email
          if (user.userDetailId?.email) {
            const recipientName = user.userDetailId.isBusinessProfile ? user.userDetailId.businessName : user.userDetailId.fullName;
            sendNewPostEmail(user.userDetailId.email, recipientName, posterName).catch(console.error);
          }
        }
      });

      await Promise.all(notifyPromises);
    } catch (err) {
      console.error('Error sending post approval notifications:', err);
    }
  });

  success(res, { post }, 'Post approved successfully');
});

const rejectPostCtrl = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const Post = require('../models/Post.model');

  const post = await Post.findByIdAndDelete(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  success(res, null, 'Post rejected and deleted successfully');
});

/**
 * Get all approved (live) shared posts for admin management, paginated
 * Query params: page, limit, search
 */
const getAllPostsCtrl = asyncHandler(async (req, res) => {
  const Post = require('../models/Post.model');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  const query = { isApproved: true };
  if (search) {
    query.content = { $regex: search, $options: 'i' };
  }

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate({
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage isBusinessProfile businessName businessLogo' },
        select: 'userDetailId',
      })
      .populate('authorCity')
      .populate('connectionGroupId', 'name')
      .populate({
        path: 'sharedPostId',
        populate: {
          path: 'userId',
          populate: { path: 'userDetailId', select: 'fullName profileImage isBusinessProfile businessName businessLogo' },
          select: 'userDetailId'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(query),
  ]);

  success(res, {
    posts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  }, 'Posts retrieved successfully');
});

/**
 * Toggle a post's visibility (isApproved true <-> false).
 * Disabling hides it from all feeds; enabling restores it.
 */
const togglePostVisibilityCtrl = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const Post = require('../models/Post.model');

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  post.isApproved = !post.isApproved;
  await post.save();

  success(res, { post }, `Post has been ${post.isApproved ? 'enabled' : 'disabled'} successfully`);
});

/**
 * Permanently delete a post by admin
 */
const adminDeletePostCtrl = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const Post = require('../models/Post.model');

  const post = await Post.findByIdAndDelete(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  success(res, null, 'Post deleted successfully');
});

/**
 * Get paginated list of sports with search
 * Query params: page, limit, search, isActive
 */
const getSportsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getSportsList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Sports retrieved successfully');
});

/**
 * Get a single sport by ID
 */
const getSportByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sport = await getSportById(id);
  success(res, { sport }, 'Sport retrieved successfully');
});

/**
 * Create a new sport
 */
const createSportCtrl = asyncHandler(async (req, res) => {
  const { error } = createSportSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const sport = await createSport(req.body);
  success(res, { sport }, 'Sport created successfully');
});

/**
 * Update a sport by ID
 */
const updateSportCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updateSportSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const sport = await updateSport(id, req.body);
  success(res, { sport }, 'Sport updated successfully');
});

/**
 * Delete a sport by ID
 */
const deleteSportCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteSport(id);
  success(res, null, 'Sport deleted successfully');
});

/**
 * Get paginated list of positions
 */
const getPositionsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  const result = await getPositionsList({
    page,
    limit,
    search,
    isActive,
  });

  success(res, result, 'Positions retrieved successfully');
});

/**
 * Get a single position by ID
 */
const getPositionByIdCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const position = await getPositionById(id);
  success(res, { position }, 'Position retrieved successfully');
});

/**
 * Create a new position
 */
const createPositionCtrl = asyncHandler(async (req, res) => {
  const { error } = createPositionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const position = await createPosition(req.body);
  success(res, { position }, 'Position created successfully');
});

/**
 * Update a position by ID
 */
const updatePositionCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = updatePositionSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const position = await updatePosition(id, req.body);
  success(res, { position }, 'Position updated successfully');
});

/**
 * Delete a position by ID
 */
const deletePositionCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deletePosition(id);
  success(res, null, 'Position deleted successfully');
});

/**
 * Toggle user active/disabled status
 */
const toggleUserStatusCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const User = require('../models/User.model');
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot disable an admin user' });
  }

  user.isActive = user.isActive === false ? true : false;
  await user.save();

  success(res, { user }, `User has been ${user.isActive ? 'enabled' : 'disabled'} successfully`);
});

/**
 * Delete a user account by admin
 */
const deleteUserCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const User = require('../models/User.model');
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot delete an admin user' });
  }

  const { deleteAccount } = require('../services/user.service');
  await deleteAccount(id);

  success(res, null, 'User deleted successfully');
});

/**
 * Get scheduled mailers stats
 */
const getScheduledMailersStatsCtrl = asyncHandler(async (req, res) => {
  const MailQueue = require('../models/MailQueue.model');

  const stats = await MailQueue.aggregate([
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Construct a cleaner stats object
  const formattedStats = {
    INCOMPLETE_PROFILE: { pending: 0, sent: 0, failed: 0 },
    CITY_INDUSTRY_SNAPSHOT: { pending: 0, sent: 0, failed: 0 },
    OFFER_OF_THE_DAY: { pending: 0, sent: 0, failed: 0 }
  };

  stats.forEach(item => {
    const type = item._id.type;
    const status = item._id.status;
    if (formattedStats[type] && status) {
      formattedStats[type][status] = item.count;
    }
  });

  success(res, { stats: formattedStats }, 'Scheduled mailer stats retrieved successfully');
});

/**
 * Get scheduled mailers history/logs
 */
const getScheduledMailersLogsCtrl = asyncHandler(async (req, res) => {
  const MailQueue = require('../models/MailQueue.model');
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const type = req.query.type || '';
  const skip = (page - 1) * limit;

  const query = {};
  if (type) {
    query.type = type;
  }
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { recipient: searchRegex },
      { recipientName: searchRegex },
      { subject: searchRegex }
    ];
  }

  const total = await MailQueue.countDocuments(query);
  const logs = await MailQueue.find(query)
    .sort({ scheduledFor: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(total / limit);

  success(res, {
    logs,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }, 'Scheduled mailer logs retrieved successfully');
});

const BusinessCategory = require('../models/BusinessCategory.model');

// GET /api/admin/business-categories
const getBusinessCategoriesListCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search && search.trim()) {
    query.name = new RegExp(search.trim(), 'i');
  }
  const categories = await BusinessCategory.find(query).sort({ name: 1 });
  success(res, { categories }, 'Business categories retrieved successfully');
});

// POST /api/admin/business-categories
const createBusinessCategoryCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  const existing = await BusinessCategory.findOne({ name: name.trim() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Business category already exists' });
  }

  const category = await BusinessCategory.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    isActive: true
  });

  success(res, { category }, 'Business category created successfully');
});

// PUT /api/admin/business-categories/:id/toggle-status
const toggleBusinessCategoryCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await BusinessCategory.findById(id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Business category not found' });
  }

  category.isActive = !category.isActive;
  await category.save();

  success(res, { category }, 'Business category status toggled successfully');
});

// DELETE /api/admin/business-categories/:id
const deleteBusinessCategoryCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await BusinessCategory.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Business category not found' });
  }

  success(res, null, 'Business category deleted successfully');
});

// PUT /api/admin/business-categories/:id
const updateBusinessCategoryCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  const category = await BusinessCategory.findById(id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Business category not found' });
  }

  // Check if name is changed and already exists
  if (name.trim().toLowerCase() !== category.name.toLowerCase()) {
    const existing = await BusinessCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Business category name already exists' });
    }
  }

  category.name = name.trim();
  category.description = description ? description.trim() : '';
  await category.save();

  success(res, { category }, 'Business category updated successfully');
});

// POST /api/admin/scheduled-mailers/test
const sendTestScheduledMailerCtrl = asyncHandler(async (req, res) => {
  const { error } = testScheduledMailerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { type, email } = req.body;

  if (!process.env.SMTP_HOST) {
    return res.status(400).json({
      success: false,
      message: 'SMTP is not configured on the server. Please set SMTP_HOST environment variable.'
    });
  }

  const {
    renderIncompleteProfileEmailHtml,
    renderCityIndustrySnapshotEmailHtml,
    renderOfferOfTheDayEmailHtml
  } = require('../services/email.service');

  let subject = '';
  let html = '';

  const mailerSetting = await Setting.findOne({ key: 'scheduled_mailers_settings' });
  const defaultSubjects = {
    INCOMPLETE_PROFILE: 'Action Required: Complete your Connect India profile! 🚀',
    CITY_INDUSTRY_SNAPSHOT: 'Weekly Network Snapshot: New Matches in your City & Industry 🌐',
    OFFER_OF_THE_DAY: '{offerName} 🎁'
  };
  const configuredSubject = (mailerSetting && mailerSetting.value && mailerSetting.value[type]?.subject) || defaultSubjects[type];
  const configuredBody = mailerSetting && mailerSetting.value && mailerSetting.value[type]?.body;

  if (type === 'INCOMPLETE_PROFILE') {
    subject = `${configuredSubject} (TEST)`;
    html = renderIncompleteProfileEmailHtml('Test User', configuredBody);
  } else if (type === 'CITY_INDUSTRY_SNAPSHOT') {
    subject = `${configuredSubject} (TEST)`;
    const dummyMatches = [
      { fullName: 'Jane Doe', position: 'Senior Software Engineer', company: 'Tech Solutions' },
      { fullName: 'John Smith', position: 'Product Lead', company: 'Innovate Hub' },
      { fullName: 'Priya Sharma', position: 'Data Scientist', company: 'AI Analytics' }
    ];
    html = renderCityIndustrySnapshotEmailHtml('Test User', dummyMatches, configuredBody);
  } else if (type === 'OFFER_OF_THE_DAY') {
    let offer = await Card.findOne({ isActive: true, showInMailer: true }).lean();
    if (!offer) {
      offer = await Card.findOne({ isActive: true }).lean();
    }
    if (!offer) {
      offer = {
        name: 'Premium Member Benefits (Sample Offer)',
        description: 'Enjoy exclusive discounts on coworking spaces, software tools, and professional courses tailored for you.',
        features: [
          'Up to 30% discount on partner coworking spaces',
          'Free premium features access for 3 months',
          'Priority access to networking events'
        ],
        url: 'https://connect.in/offers',
        logo_image: ''
      };
    }
    const subjectTemplate = offer.customSubject || configuredSubject;
    const resolvedSubject = subjectTemplate.replace(/{offerName}/g, offer.name).replace(/{name}/g, offer.name);
    subject = `${resolvedSubject} (TEST)`;
    html = renderOfferOfTheDayEmailHtml('Test User', offer, configuredBody);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid mailer type' });
  }

  try {
    const FROM = `"Connect India" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: FROM,
      to: email,
      subject,
      html
    });

    success(res, null, 'Test email sent successfully to ' + email);
  } catch (err) {
    console.error(`[Email Test] Failed to send "${subject}" to ${email}:`, err);
    return res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message || 'SMTP Connection Error'}`
    });
  }
});

const testCardEmailCtrl = asyncHandler(async (req, res) => {
  const { email, subject: reqSubject, customSubject, customHtml, name, description, url, logo_image, offer_image, features } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Recipient email is required' });
  }
  if (!process.env.SMTP_HOST) {
    return res.status(400).json({
      success: false,
      message: 'SMTP is not configured on the server. Please set SMTP_HOST environment variable.'
    });
  }

  const { renderOfferOfTheDayEmailHtml } = require('../services/email.service');

  // Construct a preview offer object
  const offer = {
    name: name || 'Premium Member Benefits (Sample Offer)',
    description: description || 'Enjoy exclusive discounts on coworking spaces, software tools, and professional courses tailored for you.',
    url: url || 'https://connect.in/offers',
    logo_image: logo_image || '',
    offer_image: offer_image || '',
    features: Array.isArray(features) ? features : [],
    customHtml: customHtml || null
  };

  // Get default / configured body if customHtml is not provided
  let configuredBody = null;
  let subject = reqSubject ? reqSubject.trim() : (customSubject ? customSubject.trim() : (offer.name || 'Premium Member Benefits (Sample Offer)'));
  if (!customHtml) {
    const mailerSetting = await Setting.findOne({ key: 'scheduled_mailers_settings' });
    configuredBody = mailerSetting && mailerSetting.value && mailerSetting.value['OFFER_OF_THE_DAY']?.body;
  }

  const html = renderOfferOfTheDayEmailHtml('Test User', offer, configuredBody);

  try {
    const FROM = `"Connect India" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: FROM,
      to: email,
      subject,
      html
    });

    success(res, null, 'Test email sent successfully to ' + email);
  } catch (err) {
    console.error(`[Card Email Test] Failed to send to ${email}:`, err);
    return res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message || 'SMTP Connection Error'}`
    });
  }
});

const getScheduledMailersSettingsCtrl = asyncHandler(async (req, res) => {
  let setting = await Setting.findOne({ key: 'scheduled_mailers_settings' });

  const defaultSettings = {
    INCOMPLETE_PROFILE: {
      isEnabled: true,
      subject: 'Action Required: Complete your Connect India profile! 🚀',
      body: `<h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Complete your profile, {name}! 🚀</h2>
<p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
  We noticed that your profile is incomplete. Completing your profile helps you gain 3x more professional visibility, connect with people in your industry, and get discovered by top companies.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
  <tr>
    <td style="padding:20px 24px;">
      <p style="margin:0 0 12px;color:#081332;font-weight:600;font-size:14px;">Here is what's missing on your profile:</p>
      <ul style="margin:0;padding-left:18px;color:#6b7280;font-size:14px;line-height:2;">
        <li>Add a professional Profile Image</li>
        <li>Select your City & Industry</li>
        <li>Add your current Position & Company</li>
        <li>Specify your Hobbies, Interests, & Skills</li>
      </ul>
    </td>
  </tr>
</table>`
    },
    CITY_INDUSTRY_SNAPSHOT: {
      isEnabled: true,
      subject: 'Weekly Network Snapshot: New Matches in your City & Industry 🌐',
      body: `<h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Weekly Network Snapshot 🌐</h2>
<p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
  Hi <strong>{name}</strong>,<br/>
  Here is a snapshot of recently registered users in your city and industry. Connect with them to expand your local professional network!
</p>
{matches}`
    },
    OFFER_OF_THE_DAY: {
      isEnabled: true,
      subject: '{offerName} 🎁',
      body: `<h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Offer of the Day! 🎁</h2>
<p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
  Hi <strong>{name}</strong>,<br/>
  Here is today's exclusive offer handpicked for you on Connect India. Check it out and unlock great benefits today!
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;overflow:hidden;">
  {offerLogo}
  <tr>
    <td style="padding:20px 24px;">
      <h3 style="margin:0 0 8px;color:#081332;font-size:18px;font-weight:700;">{offerName}</h3>
      <p style="margin:0 0 16px;color:#495057;font-size:14px;line-height:1.6;">{offerDescription}</p>
      {offerFeatures}
    </td>
  </tr>
</table>`
    }
  };

  const settings = setting && setting.value ? {
    ...defaultSettings,
    ...setting.value
  } : defaultSettings;

  success(res, { settings }, 'Scheduled mailer settings retrieved successfully');
});

const updateScheduledMailersSettingsCtrl = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Settings object is required' });
  }

  const updatedSetting = await Setting.findOneAndUpdate(
    { key: 'scheduled_mailers_settings' },
    { value: settings },
    { upsert: true, new: true }
  );

  success(res, { settings: updatedSetting.value }, 'Scheduled mailer settings updated successfully');
});

const OfferCategory = require('../models/OfferCategory.model');

// GET /api/admin/offer-categories
const getOfferCategoriesListCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search && search.trim()) {
    query.name = new RegExp(search.trim(), 'i');
  }
  const categories = await OfferCategory.find(query).sort({ name: 1 });
  success(res, { categories }, 'Offer categories retrieved successfully');
});

// POST /api/admin/offer-categories
const createOfferCategoryCtrl = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  const existing = await OfferCategory.findOne({ name: name.trim() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Offer category already exists' });
  }

  const category = await OfferCategory.create({
    name: name.trim(),
    isActive: true
  });

  success(res, { category }, 'Offer category created successfully');
});

module.exports = {
  getBusinessCategoriesListCtrl,
  createBusinessCategoryCtrl,
  toggleBusinessCategoryCtrl,
  deleteBusinessCategoryCtrl,
  updateBusinessCategoryCtrl,
  getTrafficSourcesStatsCtrl,
  getTrafficSourceTrendCtrl,
  getUsersListCtrl,
  getSkillsListCtrl,
  getSkillByIdCtrl,
  createSkillCtrl,
  updateSkillCtrl,
  deleteSkillCtrl,
  getPositionsListCtrl,
  getPositionByIdCtrl,
  createPositionCtrl,
  updatePositionCtrl,
  deletePositionCtrl,
  getInterestsListCtrl,
  getInterestByIdCtrl,
  createInterestCtrl,
  updateInterestCtrl,
  deleteInterestCtrl,
  getCitiesListCtrl,
  getCityByIdCtrl,
  createCityCtrl,
  updateCityCtrl,
  deleteCityCtrl,
  getHabitsListCtrl,
  getHabitByIdCtrl,
  createHabitCtrl,
  updateHabitCtrl,
  deleteHabitCtrl,
  getCompaniesListCtrl,
  getCompanyByIdCtrl,
  createCompanyCtrl,
  updateCompanyCtrl,
  deleteCompanyCtrl,
  getIndustriesListCtrl,
  getIndustryByIdCtrl,
  createIndustryCtrl,
  updateIndustryCtrl,
  deleteIndustryCtrl,
  getCardsListCtrl,
  getCardByIdCtrl,
  createCardCtrl,
  updateCardCtrl,
  deleteCardCtrl,
  getCardClicksCtrl,
  broadcastCardMailerCtrl,
  broadcastAllCardsMailerCtrl,
  broadcastAllCardsMailerCountCtrl,
  broadcastCardSmsCtrl,
  sendBroadcastNotificationCtrl,
  getAuthBannersCtrl,
  createAuthBannerCtrl,
  deleteAuthBannerCtrl,
  toggleAuthBannerCtrl,
  broadcastOfferEmailCtrl,
  getIncompleteProfileCountCtrl,
  downloadIncompleteProfilesCSVCtrl,
  sendIncompleteProfileSmsCtrl,
  getGeneralUserCountCtrl,
  sendGeneralSmsBroadcastCtrl,
  getTargetedEmailUserCountCtrl,
  sendTargetedEmailBroadcastCtrl,
  getDashboardStatsCtrl,
  getStatsTrendCtrl,
  getPendingPostsCtrl,
  approvePostCtrl,
  rejectPostCtrl,
  getAllPostsCtrl,
  togglePostVisibilityCtrl,
  adminDeletePostCtrl,
  getSportsListCtrl,
  getSportByIdCtrl,
  createSportCtrl,
  updateSportCtrl,
  deleteSportCtrl,
  toggleUserStatusCtrl,
  deleteUserCtrl,
  getPopupSettingCtrl,
  updatePopupSettingCtrl,
  getScheduledMailersStatsCtrl,
  getScheduledMailersLogsCtrl,
  sendTestScheduledMailerCtrl,
  testCardEmailCtrl,
  getScheduledMailersSettingsCtrl,
  updateScheduledMailersSettingsCtrl,
  getOfferCategoriesListCtrl,
  createOfferCategoryCtrl,
};
