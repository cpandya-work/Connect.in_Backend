const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Skill = require('../models/Skill.model');
const Interest = require('../models/Interest.model');
const City = require('../models/City.model');
const Habit = require('../models/Habit.model');
const Company = require('../models/Company.model');
const Industry = require('../models/Industry.model');
const Card = require('../models/Card.model');
const { deleteFromCloudinary } = require('../utils/cloudinary');

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
  const normalizedName = skillData.name;
  
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
    const normalizedName = updateData.name;
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
  const normalizedName = interestData.name;
  
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
    const normalizedName = updateData.name;
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

  // Get cities with pagination — metro cities first, then alphabetical
  const cities = await City.find(query)
    .sort({ isMetro: -1, name: 1 })
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
  const normalizedName = cityData.name;
  
  // Check if city already exists
  const existingCity = await City.findOne({ name: normalizedName });
  if (existingCity) {
    throw new Error('City with this name already exists');
  }

  const city = await City.create({
    name: normalizedName,
    isMetro: cityData.isMetro !== undefined ? cityData.isMetro : false,
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
    const normalizedName = updateData.name;
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

/**
 * Get all habits with pagination and search
 */
const getHabitsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
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
  const total = await Habit.countDocuments(query);

  // Get habits with pagination
  const habits = await Habit.find(query)
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    habits,
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
 * Create a new habit
 */
const createHabit = async (habitData) => {
  // Normalize habit name to lowercase for uniqueness
  const normalizedName = habitData.name;
  
  // Check if habit already exists
  const existingHabit = await Habit.findOne({ name: normalizedName });
  if (existingHabit) {
    throw new Error('Habit with this name already exists');
  }

  const habit = await Habit.create({
    name: normalizedName,
    description: habitData.description || '',
    isActive: habitData.isActive !== undefined ? habitData.isActive : true,
  });

  return habit;
};

/**
 * Update a habit by ID
 */
const updateHabit = async (habitId, updateData) => {
  const habit = await Habit.findById(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name;
    const existingHabit = await Habit.findOne({ 
      name: normalizedName,
      _id: { $ne: habitId } // Exclude current habit
    });
    if (existingHabit) {
      throw new Error('Habit with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(habit, updateData);
  await habit.save();

  return habit;
};

/**
 * Delete a habit by ID
 */
const deleteHabit = async (habitId) => {
  const habit = await Habit.findById(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  await Habit.deleteOne({ _id: habitId });
  return { message: 'Habit deleted successfully' };
};

/**
 * Get a single habit by ID
 */
const getHabitById = async (habitId) => {
  const habit = await Habit.findById(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }
  return habit;
};

/**
 * Get all companies with pagination and search
 */
const getCompaniesList = async ({ page = 1, limit = 10, search = '', isActive = null, industry = null } = {}) => {
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

  // Filter by industry if provided
  if (industry && industry.trim()) {
    query.industry = industry.trim();
  }

  // Get total count
  const total = await Company.countDocuments(query);

  // Get companies with pagination - industry is always populated in the response
  const companies = await Company.find(query)
    .populate({
      path: 'industry',
      select: '_id name description isActive createdAt updatedAt'
    })
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    companies,
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
 * Create a new company
 */
const createCompany = async (companyData) => {
  // Normalize company name to lowercase for uniqueness
  const normalizedName = companyData.name;
  
  // Check if company already exists
  const existingCompany = await Company.findOne({ name: normalizedName });
  if (existingCompany) {
    throw new Error('Company with this name already exists');
  }

  // Validate that industry exists
  if (companyData.industry) {
    const industry = await Industry.findById(companyData.industry);
    if (!industry) {
      throw new Error('Industry not found');
    }
  } else {
    throw new Error('Industry is required');
  }

  const company = await Company.create({
    name: normalizedName,
    description: companyData.description || '',
    industry: companyData.industry,
    isActive: companyData.isActive !== undefined ? companyData.isActive : true,
  });

  // Populate industry before returning
  await company.populate({
    path: 'industry',
    select: '_id name description isActive createdAt updatedAt'
  });

  return company;
};

/**
 * Update a company by ID
 */
const updateCompany = async (companyId, updateData) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name;
    const existingCompany = await Company.findOne({ 
      name: normalizedName,
      _id: { $ne: companyId } // Exclude current company
    });
    if (existingCompany) {
      throw new Error('Company with this name already exists');
    }
    updateData.name = normalizedName;
  }

  // If industry is being updated, validate that it exists
  if (updateData.industry) {
    const industry = await Industry.findById(updateData.industry);
    if (!industry) {
      throw new Error('Industry not found');
    }
  }

  Object.assign(company, updateData);
  await company.save();

  // Populate industry before returning
  await company.populate({
    path: 'industry',
    select: '_id name description isActive createdAt updatedAt'
  });

  return company;
};

/**
 * Delete a company by ID
 */
const deleteCompany = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  await Company.deleteOne({ _id: companyId });
  return { message: 'Company deleted successfully' };
};

/**
 * Get a single company by ID
 */
const getCompanyById = async (companyId) => {
  const company = await Company.findById(companyId)
    .populate({
      path: 'industry',
      select: '_id name description isActive createdAt updatedAt'
    });
  if (!company) {
    throw new Error('Company not found');
  }
  return company;
};

/**
 * Get all industries with pagination and search
 */
const getIndustriesList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
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
  const total = await Industry.countDocuments(query);

  // Get industries with pagination
  const industries = await Industry.find(query)
    .sort({ name: 1 }) // Sort alphabetically
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    industries,
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
 * Create a new industry
 */
const createIndustry = async (industryData) => {
  // Normalize industry name to lowercase for uniqueness
  const normalizedName = industryData.name;
  
  // Check if industry already exists
  const existingIndustry = await Industry.findOne({ name: normalizedName });
  if (existingIndustry) {
    throw new Error('Industry with this name already exists');
  }

  const industry = await Industry.create({
    name: normalizedName,
    description: industryData.description || '',
    isActive: industryData.isActive !== undefined ? industryData.isActive : true,
  });

  return industry;
};

/**
 * Update an industry by ID
 */
const updateIndustry = async (industryId, updateData) => {
  const industry = await Industry.findById(industryId);
  if (!industry) {
    throw new Error('Industry not found');
  }

  // If name is being updated, check for duplicates
  if (updateData.name) {
    const normalizedName = updateData.name;
    const existingIndustry = await Industry.findOne({ 
      name: normalizedName,
      _id: { $ne: industryId } // Exclude current industry
    });
    if (existingIndustry) {
      throw new Error('Industry with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(industry, updateData);
  await industry.save();

  return industry;
};

/**
 * Delete an industry by ID
 */
const deleteIndustry = async (industryId) => {
  const industry = await Industry.findById(industryId);
  if (!industry) {
    throw new Error('Industry not found');
  }

  await Industry.deleteOne({ _id: industryId });
  return { message: 'Industry deleted successfully' };
};

/**
 * Get a single industry by ID
 */
const getIndustryById = async (industryId) => {
  const industry = await Industry.findById(industryId);
  if (!industry) {
    throw new Error('Industry not found');
  }
  return industry;
};

/**
 * Get all cards with pagination and search
 */
const getCardsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
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
  const total = await Card.countDocuments(query);

  // Get cards with pagination
  const cards = await Card.find(query)
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    cards,
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
 * Create a new card
 * logo_image should already contain the Cloudinary URL from the uploaded file
 */
const createCard = async (cardData) => {
  const card = await Card.create({
    name: cardData.name,
    description: cardData.description || '',
    logo_image: cardData.logo_image, // Cloudinary URL from file upload
    url: cardData.url.trim(),
    features: cardData.features || [],
    eligibles: cardData.eligibles || [],
    isActive: cardData.isActive !== undefined ? cardData.isActive : true,
  });

  return card;
};

/**
 * Update a card by ID
 */
const updateCard = async (cardId, updateData, file = null) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new Error('Card not found');
  }

  // If a new image file is uploaded, delete the old one and use the new URL
  if (file && file.path) {
    // Delete old image if it exists
    if (card.logo_image) {
      await deleteFromCloudinary(card.logo_image);
    }
    updateData.logo_image = file.path;
  }

  // Trim string fields if provided
  if (updateData.name) {
    updateData.name = updateData.name.trim();
  }
  if (updateData.description !== undefined) {
    updateData.description = updateData.description.trim();
  }
  if (updateData.logo_image !== undefined && !file) {
    // Only trim if it's a URL string, not a file upload
    updateData.logo_image = updateData.logo_image.trim();
  }
  if (updateData.url !== undefined) {
    updateData.url = updateData.url.trim();
  }
  if (updateData.features !== undefined && Array.isArray(updateData.features)) {
    updateData.features = updateData.features.map(f => f.trim()).filter(f => f.length > 0);
  }
  if (updateData.eligibles !== undefined && Array.isArray(updateData.eligibles)) {
    updateData.eligibles = updateData.eligibles.map(e => e.trim()).filter(e => e.length > 0);
  }

  Object.assign(card, updateData);
  await card.save();

  return card;
};

/**
 * Delete a card by ID
 */
const deleteCard = async (cardId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new Error('Card not found');
  }

  await Card.deleteOne({ _id: cardId });
  return { message: 'Card deleted successfully' };
};

/**
 * Get a single card by ID
 */
const getCardById = async (cardId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new Error('Card not found');
  }
  return card;
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
};

