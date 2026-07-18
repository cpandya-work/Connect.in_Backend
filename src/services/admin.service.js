const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Skill = require('../models/Skill.model');
const Sport = require('../models/Sport.model');
const Interest = require('../models/Interest.model');
const City = require('../models/City.model');
const Habit = require('../models/Habit.model');
const Company = require('../models/Company.model');
const Industry = require('../models/Industry.model');
const Card = require('../models/Card.model');
const AuthBanner = require('../models/AuthBanner.model');
const UserRequests = require('../models/UserRequests.model');
const UserLikes = require('../models/UserLikes.model');
const Post = require('../models/Post.model');
const Position = require('../models/Position.model');
const UserChat = require('../models/UserChat.model');
const { deleteFromCloudinary } = require('../utils/cloudinary');
const { sendBroadcastOfferEmail } = require('./email.service');

/**
 * Get paginated list of users with search functionality
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search query (searches in name, email, phone, city)
 * @returns {Promise<Object>} Paginated user list with metadata
 */
const getUsersList = async ({ page = 1, limit = 10, search = '', city = '', industry = '', interest = '', religion = '' } = {}) => {
  // Convert page and limit to numbers
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  const mongoose = require('mongoose');
  let searchQuery = {};
  
  const hasFilters = (city && city.trim()) || (industry && industry.trim()) || (interest && interest.trim()) || (religion && religion.trim());

  if (hasFilters) {
    let detailQuery = {};
    
    if (city && city.trim()) {
      if (mongoose.Types.ObjectId.isValid(city.trim())) {
        detailQuery.city = city.trim();
      } else {
        const matchingCities = await City.find({ name: new RegExp(city.trim(), 'i') }).select('_id').lean();
        detailQuery.city = { $in: matchingCities.map(c => c._id) };
      }
    }
    
    if (religion && religion.trim()) {
      detailQuery.religion = new RegExp(religion.trim(), 'i');
    }
    
    if (industry && industry.trim()) {
      const trimmedIndustry = industry.trim();
      if (mongoose.Types.ObjectId.isValid(trimmedIndustry)) {
        detailQuery.industry = { $in: [trimmedIndustry, new mongoose.Types.ObjectId(trimmedIndustry)] };
      } else {
        const matchingIndustries = await Industry.find({ name: new RegExp(trimmedIndustry, 'i') }).select('_id').lean();
        const matchingIds = matchingIndustries.map(ind => ind._id);
        const matchingIdStrings = matchingIds.map(id => id.toString());
        detailQuery.industry = { $in: [...matchingIds, ...matchingIdStrings] };
      }
    }
    
    if (interest && interest.trim()) {
      detailQuery.interests = new RegExp(interest.trim(), 'i');
    }
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const matchingCitiesForSearch = await City.find({ name: searchRegex }).select('_id').lean();
      
      detailQuery.$and = detailQuery.$and || [];
      detailQuery.$and.push({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          ...(matchingCitiesForSearch.length > 0 ? [{ city: { $in: matchingCitiesForSearch.map(c => c._id) } }] : []),
        ]
      });
    }
    
    const userDetailsWithSearch = await UserDetail.find(detailQuery).select('_id');
    const userDetailIds = userDetailsWithSearch.map((detail) => detail._id);
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      searchQuery = {
        $or: [
          { phoneNumber: searchRegex },
          { userDetailId: { $in: userDetailIds } }
        ]
      };
    } else {
      searchQuery = {
        userDetailId: { $in: userDetailIds }
      };
    }
  } else if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');

    // Find cities matching the search term to support city-name search
    const matchingCities = await City.find({ name: searchRegex }).select('_id').lean();
    const matchingCityIds = matchingCities.map(c => c._id);

    // Search in UserDetail fields (city is an ObjectId ref, so use matched IDs)
    const userDetailsWithSearch = await UserDetail.find({
      $or: [
        { fullName: searchRegex },
        { email: searchRegex },
        ...(matchingCityIds.length > 0 ? [{ city: { $in: matchingCityIds } }] : []),
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

  // Fetch all cities for matching IDs to names in memory
  const allCities = await City.find({}).select('_id name').lean();
  const cityMap = {};
  allCities.forEach(c => {
    if (c && c._id) {
      cityMap[c._id.toString()] = c.name;
    }
  });

  // Format user data
  const formattedUsers = users.map((user) => {
    const userObj = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      trafficSource: user.trafficSource || 'direct',
      isActive: user.isActive !== false,
      currentLocation: user.currentLocation,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userDetails: null,
    };

    if (user.userDetailId) {
      let cityStr = null;
      const cityVal = user.userDetailId.city;
      if (cityVal) {
        cityStr = cityMap[cityVal.toString()] || cityVal.toString();
      }

      userObj.userDetails = {
        _id: user.userDetailId._id,
        fullName: user.userDetailId.fullName,
        email: user.userDetailId.email,
        city: cityStr,
        religion: user.userDetailId.religion,
        status: user.userDetailId.status,
        gender: user.userDetailId.gender,
        dateOfBirth: user.userDetailId.dateOfBirth,
        preferredLanguage: user.userDetailId.preferredLanguage,
        habits: user.userDetailId.habits,
        interests: user.userDetailId.interests,
        skills: user.userDetailId.skills,
        industry: user.userDetailId.industry,
        company: user.userDetailId.company,
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
    offer_image: cardData.offer_image || null, // Cloudinary URL from file upload
    url: cardData.url.trim(),
    features: cardData.features || [],
    eligibles: cardData.eligibles || [],
    targetAgeMin: cardData.targetAgeMin !== undefined && cardData.targetAgeMin !== null ? parseInt(cardData.targetAgeMin, 10) : null,
    targetAgeMax: cardData.targetAgeMax !== undefined && cardData.targetAgeMax !== null ? parseInt(cardData.targetAgeMax, 10) : null,
    targetCities: cardData.targetCities || [],
    targetPositions: cardData.targetPositions || [],
    isActive: cardData.isActive !== undefined ? cardData.isActive : true,
  });

  return card;
};

/**
 * Update a card by ID
 */
const updateCard = async (cardId, updateData, files = null) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new Error('Card not found');
  }

  // Handle logo_image file upload
  const logoFile = files && files['logo_image'] ? files['logo_image'][0] : null;
  if (logoFile && logoFile.path) {
    // Delete old image if it exists
    if (card.logo_image) {
      await deleteFromCloudinary(card.logo_image);
    }
    updateData.logo_image = logoFile.path;
  }

  // Handle offer_image file upload
  const offerFile = files && files['offer_image'] ? files['offer_image'][0] : null;
  if (offerFile && offerFile.path) {
    // Delete old image if it exists
    if (card.offer_image) {
      await deleteFromCloudinary(card.offer_image);
    }
    updateData.offer_image = offerFile.path;
  }

  // Trim string fields if provided
  if (updateData.name) {
    updateData.name = updateData.name.trim();
  }
  if (updateData.description !== undefined) {
    updateData.description = updateData.description.trim();
  }
  if (updateData.logo_image !== undefined && (!files || !files['logo_image'])) {
    // Only trim if it's a URL string, not a file upload
    updateData.logo_image = updateData.logo_image.trim();
  }
  if (updateData.offer_image !== undefined && (!files || !files['offer_image'])) {
    // Only trim if it's a URL string, not a file upload
    updateData.offer_image = updateData.offer_image ? updateData.offer_image.trim() : null;
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
  if (updateData.targetCities !== undefined && Array.isArray(updateData.targetCities)) {
    updateData.targetCities = updateData.targetCities.map(c => c.trim()).filter(c => c.length > 0);
  }
  if (updateData.targetPositions !== undefined && Array.isArray(updateData.targetPositions)) {
    updateData.targetPositions = updateData.targetPositions.map(p => p.trim()).filter(p => p.length > 0);
  }
  if (updateData.targetAgeMin !== undefined) {
    updateData.targetAgeMin = updateData.targetAgeMin !== null && updateData.targetAgeMin !== '' ? parseInt(updateData.targetAgeMin, 10) : null;
  }
  if (updateData.targetAgeMax !== undefined) {
    updateData.targetAgeMax = updateData.targetAgeMax !== null && updateData.targetAgeMax !== '' ? parseInt(updateData.targetAgeMax, 10) : null;
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

const broadcastOfferEmail = async (title, description) => {
  // Collect all user emails that are not null/empty
  const userDetails = await UserDetail.find({ email: { $exists: true, $ne: null, $ne: '' } })
    .select('email')
    .lean();
  const emails = userDetails.map((u) => u.email).filter(Boolean);
  const result = await sendBroadcastOfferEmail(emails, title, description);
  return { totalEmails: emails.length, ...result };
};

const getAuthBanners = async () => {
  return await AuthBanner.find().sort({ createdAt: -1 }).lean();
};

const createAuthBanner = async ({ imageUrl, cloudinaryPublicId, type, width, height }) => {
  return await AuthBanner.create({ imageUrl, cloudinaryPublicId, type, width, height, isActive: true });
};

const deleteAuthBanner = async (id) => {
  const banner = await AuthBanner.findById(id);
  if (!banner) throw new Error('Banner not found');
  await deleteFromCloudinary(banner.cloudinaryPublicId);
  await AuthBanner.deleteOne({ _id: id });
  return { message: 'Banner deleted' };
};

const toggleAuthBanner = async (id) => {
  const banner = await AuthBanner.findById(id);
  if (!banner) throw new Error('Banner not found');
  banner.isActive = !banner.isActive;
  await banner.save();
  return banner;
};

const getActiveAuthBanners = async (type) => {
  const query = { isActive: true };
  if (type) query.type = type;
  return await AuthBanner.find(query).lean();
};

/**
 * Get count of users with incomplete profiles based on registration duration
 * @param {string|number} days - Duration in days ('all', 7, 15, 30, 45)
 */
const getIncompleteProfileUsersCount = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }

  // Find user detail IDs that are incomplete (no profile image or incomplete flag)
  const incompleteDetails = await UserDetail.find({
    $or: [
      { profileImage: { $exists: false } },
      { profileImage: '' },
      { profileImage: null },
      { isProfileComplete: false }
    ]
  }).select('_id');

  const detailIds = incompleteDetails.map(d => d._id);

  // Filter users by these details and the duration
  query.userDetailId = { $in: detailIds };
  
  return await User.countDocuments(query);
};

/**
 * Get list of users with incomplete profiles for SMS broadcast
 */
const getIncompleteProfileUsers = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }

  // Find incomplete user details
  const incompleteDetails = await UserDetail.find({
    $or: [
      { profileImage: { $exists: false } },
      { profileImage: '' },
      { profileImage: null },
      { isProfileComplete: false }
    ]
  }).select('_id fullName');

  const detailIds = incompleteDetails.map(d => d._id);
  query.userDetailId = { $in: detailIds };

  // Get users with their phone numbers and populated details
  const users = await User.find(query)
    .populate('userDetailId', 'fullName')
    .select('phoneNumber userDetailId')
    .lean();

  return users.map(user => ({
    phoneNumber: user.phoneNumber,
    fullName: user.userDetailId?.fullName || 'User'
  }));
};

/**
 * Get count of all users based on registration duration
 * @param {string|number} days - Duration in days ('all', 7, 15, 30, 45)
 */
const getUsersCountByRegistration = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }
  
  return await User.countDocuments(query);
};

/**
 * Get list of all users filtered by registration duration for SMS broadcast
 * @param {string|number} days - Duration in days ('all', 7, 15, 30, 45)
 */
const getUsersByRegistration = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }

  // Get users with their phone numbers and populated details
  const users = await User.find(query)
    .populate('userDetailId', 'fullName email')
    .select('phoneNumber userDetailId')
    .lean();

  return users.map(user => ({
    phoneNumber: user.phoneNumber,
    email: user.userDetailId?.email,
    fullName: user.userDetailId?.fullName || 'User'
  }));
};


/**
 * Get count of users with email addresses based on registration duration
 * @param {string|number} days - Duration in days ('all', 7, 15, 30, 45)
 */
const getEmailUsersCountByRegistration = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }

  // Find user details that have a registered email
  const emailDetails = await UserDetail.find({
    email: { $exists: true, $ne: null, $ne: '' }
  }).select('_id');

  const detailIds = emailDetails.map(d => d._id);
  query.userDetailId = { $in: detailIds };
  
  return await User.countDocuments(query);
};

/**
 * Get list of users with email addresses filtered by registration duration for Email broadcast
 * @param {string|number} days - Duration in days ('all', 7, 15, 30, 45)
 */
const getEmailUsersByRegistration = async (days) => {
  let query = {};
  
  if (days !== 'all') {
    const daysNum = parseInt(days, 10);
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    query.createdAt = { $gte: date };
  }

  // Find user details that have a registered email
  const emailDetails = await UserDetail.find({
    email: { $exists: true, $ne: null, $ne: '' }
  }).select('_id email fullName');

  const detailIds = emailDetails.map(d => d._id);
  query.userDetailId = { $in: detailIds };

  const users = await User.find(query)
    .populate('userDetailId', 'fullName email')
    .select('userDetailId')
    .lean();

  return users.map(user => ({
    email: user.userDetailId?.email,
    fullName: user.userDetailId?.fullName || 'User'
  })).filter(user => user.email);
};

/**
 * Get core platform metrics snapshot for Admin Dashboard
 * @returns {Promise<Object>} Object containing stats counts
 */
const getDashboardStats = async () => {
  const [
    totalUsers,
    totalConnectionRequests,
    totalLikes,
    totalOffers,
    totalSharedItems,
    totalChatMessages,
    incompleteDetails
  ] = await Promise.all([
    User.countDocuments({}),
    UserRequests.countDocuments({}),
    UserLikes.countDocuments({}),
    Card.countDocuments({}),
    Post.countDocuments({}),
    UserChat.countDocuments({}),
    UserDetail.find({
      $or: [
        { profileImage: { $exists: false } },
        { profileImage: '' },
        { profileImage: null },
        { isProfileComplete: false }
      ]
    }).select('_id')
  ]);

  const incompleteIds = incompleteDetails.map(d => d._id);
  const totalCompleteProfiles = await User.countDocuments({
    userDetailId: { $exists: true, $ne: null, $nin: incompleteIds }
  });

  return {
    totalUsers,
    totalConnectionRequests,
    totalLikes,
    totalOffers,
    totalSharedItems,
    totalChatMessages,
    totalCompleteProfiles
  };
};

/**
 * Get daily stats counts for the last 7 days for a specific statistic
 * @param {string} statId - ID of the statistic to get trend for
 * @returns {Promise<Array>} Array of { date: string, count: number }
 */
const getStatsTrend = async (statId) => {
  const trends = [];
  
  // Generate date ranges for the last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() - i);
    end.setHours(23, 59, 59, 999);

    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    trends.push({ start, end, label });
  }

  // Pre-fetch incomplete user detail IDs if we are calculating complete profiles trend
  let incompleteIds = [];
  if (statId === 'complete-profiles') {
    const incompleteDetails = await UserDetail.find({
      $or: [
        { profileImage: { $exists: false } },
        { profileImage: '' },
        { profileImage: null },
        { isProfileComplete: false }
      ]
    }).select('_id').lean();
    incompleteIds = incompleteDetails.map(d => d._id);
  }

  // Helper to count documents in date range for specified statId
  const getCountForRange = async (start, end) => {
    switch (statId) {
      case 'users':
        return await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
      case 'complete-profiles':
        return await User.countDocuments({
          userDetailId: { $exists: true, $ne: null, $nin: incompleteIds },
          createdAt: { $gte: start, $lte: end }
        });
      case 'connections':
        return await UserRequests.countDocuments({ createdAt: { $gte: start, $lte: end } });
      case 'likes':
        return await UserLikes.countDocuments({ createdAt: { $gte: start, $lte: end } });
      case 'offers':
        return await Card.countDocuments({ createdAt: { $gte: start, $lte: end } });
      case 'shared':
        return await Post.countDocuments({ createdAt: { $gte: start, $lte: end } });
      case 'messages':
        return await UserChat.countDocuments({ createdAt: { $gte: start, $lte: end } });
      default:
        throw new Error('Invalid statistic ID');
    }
  };

  // Run queries in parallel
  const results = await Promise.all(
    trends.map(async (t) => {
      const count = await getCountForRange(t.start, t.end);
      return {
        date: t.label,
        count
      };
    })
  );

  return results;
};

/**
 * Get stats of users count grouped by traffic source
 * @returns {Promise<Object>} Object containing stats array and totalCompleteProfiles
 */
const getTrafficSourcesStats = async () => {
  // Find incomplete user details
  const incompleteDetails = await UserDetail.find({
    $or: [
      { profileImage: { $exists: false } },
      { profileImage: '' },
      { profileImage: null },
      { isProfileComplete: false }
    ]
  }).select('_id');
  const incompleteIds = incompleteDetails.map(d => d._id);

  const [totalStats, completeStats] = await Promise.all([
    // Aggregate total users by traffic source
    User.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$trafficSource', 'direct'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          trafficSource: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]),
    // Aggregate completed profiles by traffic source
    User.aggregate([
      {
        $match: {
          userDetailId: { $exists: true, $ne: null, $nin: incompleteIds }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$trafficSource', 'direct'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          trafficSource: '$_id',
          count: 1,
          _id: 0
        }
      }
    ])
  ]);

  // Create a map of complete source counts
  const completeMap = {};
  completeStats.forEach(item => {
    if (item.trafficSource) {
      completeMap[item.trafficSource] = item.count;
    }
  });

  // Combine results
  const combinedStats = totalStats.map(item => ({
    trafficSource: item.trafficSource,
    count: item.count,
    completeCount: completeMap[item.trafficSource] || 0
  }));

  // Sort by total count descending
  combinedStats.sort((a, b) => b.count - a.count);

  const totalCompleteProfiles = completeStats.reduce((sum, item) => sum + item.count, 0);

  return {
    stats: combinedStats,
    totalCompleteProfiles
  };
};

/**
 * Get all sports with pagination and search
 */
const getSportsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
    ];
  }

  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const total = await Sport.countDocuments(query);
  const sports = await Sport.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    sports,
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
 * Create a new sport
 */
const createSport = async (sportData) => {
  const normalizedName = sportData.name;
  
  const existingSport = await Sport.findOne({ name: normalizedName });
  if (existingSport) {
    throw new Error('Sport with this name already exists');
  }

  const sport = await Sport.create({
    name: normalizedName,
    description: sportData.description || '',
    isActive: sportData.isActive !== undefined ? sportData.isActive : true,
  });

  return sport;
};

/**
 * Update a sport by ID
 */
const updateSport = async (sportId, updateData) => {
  const sport = await Sport.findById(sportId);
  if (!sport) {
    throw new Error('Sport not found');
  }

  if (updateData.name) {
    const normalizedName = updateData.name;
    const existingSport = await Sport.findOne({ 
      name: normalizedName,
      _id: { $ne: sportId }
    });
    if (existingSport) {
      throw new Error('Sport with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(sport, updateData);
  await sport.save();

  return sport;
};

/**
 * Delete a sport by ID
 */
const deleteSport = async (sportId) => {
  const sport = await Sport.findById(sportId);
  if (!sport) {
    throw new Error('Sport not found');
  }

  await Sport.deleteOne({ _id: sportId });
  return { message: 'Sport deleted successfully' };
};

/**
 * Get a single sport by ID
 */
const getSportById = async (sportId) => {
  const sport = await Sport.findById(sportId);
  if (!sport) {
    throw new Error('Sport not found');
  }
  return sport;
};

/**
 * Get paginated list of positions with search functionality
 */
const getPositionsList = async ({ page = 1, limit = 10, search = '', isActive = null } = {}) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  let query = {};
  
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
    ];
  }

  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const total = await Position.countDocuments(query);
  const positions = await Position.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    positions,
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
 * Create a new position
 */
const createPosition = async (positionData) => {
  const normalizedName = positionData.name;
  
  const existingPosition = await Position.findOne({ name: normalizedName });
  if (existingPosition) {
    throw new Error('Position with this name already exists');
  }

  const position = await Position.create({
    name: normalizedName,
    description: positionData.description || '',
    isActive: positionData.isActive !== undefined ? positionData.isActive : true,
  });

  return position;
};

/**
 * Update a position by ID
 */
const updatePosition = async (positionId, updateData) => {
  const position = await Position.findById(positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  if (updateData.name) {
    const normalizedName = updateData.name;
    const existingPosition = await Position.findOne({ 
      name: normalizedName,
      _id: { $ne: positionId }
    });
    if (existingPosition) {
      throw new Error('Position with this name already exists');
    }
    updateData.name = normalizedName;
  }

  Object.assign(position, updateData);
  await position.save();

  return position;
};

/**
 * Delete a position by ID
 */
const deletePosition = async (positionId) => {
  const position = await Position.findById(positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  await Position.deleteOne({ _id: positionId });
  return { message: 'Position deleted successfully' };
};

/**
 * Get a single position by ID
 */
const getPositionById = async (positionId) => {
  const position = await Position.findById(positionId);
  if (!position) {
    throw new Error('Position not found');
  }
  return position;
};

module.exports = {
  getPositionsList,
  createPosition,
  updatePosition,
  deletePosition,
  getPositionById,
  getSportsList,
  createSport,
  updateSport,
  deleteSport,
  getSportById,
  getTrafficSourcesStats,
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
  getActiveAuthBanners,
  broadcastOfferEmail,
  getIncompleteProfileUsersCount,
  getIncompleteProfileUsers,
  getUsersCountByRegistration,
  getUsersByRegistration,
  getEmailUsersCountByRegistration,
  getEmailUsersByRegistration,
  getDashboardStats,
  getStatsTrend,
};

