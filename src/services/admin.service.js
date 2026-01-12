const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Skill = require('../models/Skill.model');
const Interest = require('../models/Interest.model');
const City = require('../models/City.model');

/**
 * Get paginated list of users with search functionality
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search query (searches in name, email, phone, city)
 * @returns {Promise<Object>} Paginated user list with metadata
 */
const getUsersList = async ({ page = 1, limit = 10, search = '' } = {}) => {
  // Convert page and limit to numbers
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  let searchQuery = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    
    // Search in UserDetail fields
    const userDetailsWithSearch = await UserDetail.find({
      $or: [
        { fullName: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
      ],
    }).select('_id');

    const userDetailIds = userDetailsWithSearch.map((detail) => detail._id);

    // Search in User fields
    searchQuery = {
      $or: [
        { phoneNumber: searchRegex },
        { userDetailId: { $in: userDetailIds } },
      ],
    };
  }

  // Get total count for pagination
  const total = await User.countDocuments(searchQuery);

  // Get users with pagination
  const users = await User.find(searchQuery)
    .populate('userDetailId')
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Format user data
  const formattedUsers = users.map((user) => {
    const userObj = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      currentLocation: user.currentLocation,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userDetails: null,
    };

    if (user.userDetailId) {
      userObj.userDetails = {
        _id: user.userDetailId._id,
        fullName: user.userDetailId.fullName,
        email: user.userDetailId.email,
        city: user.userDetailId.city,
        religion: user.userDetailId.religion,
        status: user.userDetailId.status,
        gender: user.userDetailId.gender,
        dateOfBirth: user.userDetailId.dateOfBirth,
        preferredLanguage: user.userDetailId.preferredLanguage,
        habits: user.userDetailId.habits,
        interests: user.userDetailId.interests,
        skills: user.userDetailId.skills,
        profileImage: user.userDetailId.profileImage,
        originalPassword: user.userDetailId.originalPassword, // Include original password for admin
      };
    }

    return userObj;
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    users: formattedUsers,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Get all skills with pagination and search
 */
const getSkillsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
    ];
  }

  // Filter by isActive if provided
  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  // Get total count
  const total = await Skill.countDocuments(query);

  // Get skills with pagination
  const skills = await Skill.find(query)
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    skills,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Create a new skill
 */
const createSkill = async (skillData) => {
  // Normalize skill name to lowercase for uniqueness
  const normalizedName = skillData.name.trim().toLowerCase();
  
  // Check if skill already exists
  const existingSkill = await Skill.findOne({ name: normalizedName });
  if (existingSkill) {
    throw new Error('Skill with this name already exists');
  }

  const skill = await Skill.create({
    name: normalizedName,
    description: skillData.description || '',
    isActive: skillData.isActive !== undefined ? skillData.isActive : true,
  });

  return skill;
};

/**
 * Update a skill by ID
 */
const updateSkill = async (skillId, updateData) => {
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name.trim().toLowerCase();
    const existingSkill = await Skill.findOne({ 
      name: normalizedName,
      _id: { $ne: skillId } // Exclude current skill
    });
    if (existingSkill) {
      throw new Error('Skill with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(skill, updateData);
  await skill.save();

  return skill;
};

/**
 * Delete a skill by ID
 */
const deleteSkill = async (skillId) => {
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }

  await Skill.deleteOne({ _id: skillId });
  return { message: 'Skill deleted successfully' };
};

/**
 * Get a single skill by ID
 */
const getSkillById = async (skillId) => {
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }
  return skill;
};

/**
 * Get all interests with pagination and search
 */
const getInterestsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.name = searchRegex;
  }

  // Filter by isActive if provided
  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  // Get total count
  const total = await Interest.countDocuments(query);

  // Get interests with pagination
  const interests = await Interest.find(query)
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    interests,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Create a new interest
 */
const createInterest = async (interestData) => {
  // Normalize interest name to lowercase for uniqueness
  const normalizedName = interestData.name.trim().toLowerCase();
  
  // Check if interest already exists
  const existingInterest = await Interest.findOne({ name: normalizedName });
  if (existingInterest) {
    throw new Error('Interest with this name already exists');
  }

  const interest = await Interest.create({
    name: normalizedName,
    isActive: interestData.isActive !== undefined ? interestData.isActive : true,
  });

  return interest;
};

/**
 * Update an interest by ID
 */
const updateInterest = async (interestId, updateData) => {
  const interest = await Interest.findById(interestId);
  if (!interest) {
    throw new Error('Interest not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name.trim().toLowerCase();
    const existingInterest = await Interest.findOne({ 
      name: normalizedName,
      _id: { $ne: interestId } // Exclude current interest
    });
    if (existingInterest) {
      throw new Error('Interest with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(interest, updateData);
  await interest.save();

  return interest;
};

/**
 * Delete an interest by ID
 */
const deleteInterest = async (interestId) => {
  const interest = await Interest.findById(interestId);
  if (!interest) {
    throw new Error('Interest not found');
  }

  await Interest.deleteOne({ _id: interestId });
  return { message: 'Interest deleted successfully' };
};

/**
 * Get a single interest by ID
 */
const getInterestById = async (interestId) => {
  const interest = await Interest.findById(interestId);
  if (!interest) {
    throw new Error('Interest not found');
  }
  return interest;
};

/**
 * Get all cities with pagination and search
 */
const getCitiesList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.name = searchRegex;
  }

  // Filter by isActive if provided
  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  // Get total count
  const total = await City.countDocuments(query);

  // Get cities with pagination
  const cities = await City.find(query)
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    cities,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Create a new city
 */
const createCity = async (cityData) => {
  // Normalize city name to lowercase for uniqueness
  const normalizedName = cityData.name.trim().toLowerCase();
  
  // Check if city already exists
  const existingCity = await City.findOne({ name: normalizedName });
  if (existingCity) {
    throw new Error('City with this name already exists');
  }

  const city = await City.create({
    name: normalizedName,
    isActive: cityData.isActive !== undefined ? cityData.isActive : true,
  });

  return city;
};

/**
 * Update a city by ID
 */
const updateCity = async (cityId, updateData) => {
  const city = await City.findById(cityId);
  if (!city) {
    throw new Error('City not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name.trim().toLowerCase();
    const existingCity = await City.findOne({ 
      name: normalizedName,
      _id: { $ne: cityId } // Exclude current city
    });
    if (existingCity) {
      throw new Error('City with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(city, updateData);
  await city.save();

  return city;
};

/**
 * Delete a city by ID
 */
const deleteCity = async (cityId) => {
  const city = await City.findById(cityId);
  if (!city) {
    throw new Error('City not found');
  }

  await City.deleteOne({ _id: cityId });
  return { message: 'City deleted successfully' };
};

/**
 * Get a single city by ID
 */
const getCityById = async (cityId) => {
  const city = await City.findById(cityId);
  if (!city) {
    throw new Error('City not found');
  }
  return city;
};

module.exports = {
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
};
