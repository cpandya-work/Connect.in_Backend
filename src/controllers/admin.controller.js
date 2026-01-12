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
  getCityById
} = require('../services/admin.service');
const { createSkillSchema, updateSkillSchema } = require('../validators/skill.validator');
const { createInterestSchema, updateInterestSchema } = require('../validators/interest.validator');
const { createCitySchema, updateCitySchema } = require('../validators/city.validator');

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
};
