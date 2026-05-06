const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const {
  getUsersList,
  getSkillsList,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillById,
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
} = require('../services/admin.service');
const { createSkillSchema, updateSkillSchema } = require('../validators/skill.validator');
const { createInterestSchema, updateInterestSchema } = require('../validators/interest.validator');
const { createCitySchema, updateCitySchema } = require('../validators/city.validator');
const { createHabitSchema, updateHabitSchema } = require('../validators/habit.validator');
const { createCompanySchema, updateCompanySchema } = require('../validators/company.validator');
const { createIndustrySchema, updateIndustrySchema } = require('../validators/industry.validator');
const { createCardSchema, updateCardSchema } = require('../validators/card.validator');
const { broadcastNotificationSchema } = require('../validators/broadcast.validator');
const { sendBroadcastNotification } = require('../services/notification.service');

/**
 * Get paginated list of users with search
 * Query params: page, limit, search
 */
const getUsersListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;

  const result = await getUsersList({
    page,
    limit,
    search,
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
  console.log(req.body,'body');
  
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
  const { page, limit, search, isActive } = req.query;

  const result = await getCardsList({
    page,
    limit,
    search,
    isActive,
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
  // Image file is required for card creation
  if (!req.file || !req.file.path) {
    return res.status(400).json({ 
      success: false, 
      message: 'Logo image is required. Please upload an image file.' 
    });
  }

  // Parse features and eligibles from form-data
  const features = parseArrayField(req.body.features);
  const eligibles = parseArrayField(req.body.eligibles);

  // Use the Cloudinary URL from the uploaded file
  const cardData = { 
    ...req.body,
    logo_image: req.file.path, // Cloudinary URL
    features: features, // Parsed array
    eligibles: eligibles // Parsed array
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
  
  // If file is uploaded, use file path; otherwise use logo_image from body
  const updateData = { ...req.body };
  if (req.file && req.file.path) {
    updateData.logo_image = req.file.path;
  }
  
  // Parse features and eligibles if provided
  if (updateData.features !== undefined) {
    updateData.features = parseArrayField(updateData.features);
  }
  if (updateData.eligibles !== undefined) {
    updateData.eligibles = parseArrayField(updateData.eligibles);
  }
  
  const { error } = updateCardSchema.validate(updateData);
  
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }

  const card = await updateCard(id, updateData, req.file);
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

module.exports = {
  getUsersListCtrl,
  getSkillsListCtrl,
  getSkillByIdCtrl,
  createSkillCtrl,
  updateSkillCtrl,
  deleteSkillCtrl,
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
  sendBroadcastNotificationCtrl,
  getAuthBannersCtrl,
  createAuthBannerCtrl,
  deleteAuthBannerCtrl,
  toggleAuthBannerCtrl,
  broadcastOfferEmailCtrl,
};
