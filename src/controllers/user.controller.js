const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const City = require('../models/City.model');
const Company = require('../models/Company.model');
const Industry = require('../models/Industry.model');
const Position = require('../models/Position.model');
const BusinessCategory = require('../models/BusinessCategory.model');
const { profileSchema, updateProfileSchema } = require('../validators/user.validator');
const { success } = require('../utils/response');
const { getPublicProfile, updateProfile, deleteAccount } = require('../services/user.service');
const { sendRegistrationEmail } = require('../services/email.service');
const { sendRegistrationSms } = require('../services/sms.service');
const { verifyToken } = require('../config/jwt');
const mongoose = require('mongoose');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'userDetailId',
    populate: { path: 'city', model: 'City' }
  });
  
  if (!user.userDetailId) {
    return success(res, { profile: null });
  }
  
  // Get city name
  let cityName = null;
  if (user.userDetailId.city) {
    if (typeof user.userDetailId.city === 'object' && user.userDetailId.city.name) {
      // City is populated
      cityName = user.userDetailId.city.name;
    } else if (mongoose.Types.ObjectId.isValid(user.userDetailId.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(user.userDetailId.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = user.userDetailId.company;
  if (user.userDetailId.company && mongoose.Types.ObjectId.isValid(user.userDetailId.company)) {
    const company = await Company.findById(user.userDetailId.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  const isHexId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());

  // Get industry name if industry is a valid ObjectId
  let industryName = user.userDetailId.industry;
  if (user.userDetailId.industry && mongoose.Types.ObjectId.isValid(user.userDetailId.industry)) {
    const industry = await Industry.findById(user.userDetailId.industry);
    industryName = industry ? industry.name : '';
  } else if (isHexId(industryName)) {
    industryName = '';
  }

  // Get position name if position is a valid ObjectId
  let positionName = user.userDetailId.position;
  if (user.userDetailId.position && mongoose.Types.ObjectId.isValid(user.userDetailId.position)) {
    const positionObj = await Position.findById(user.userDetailId.position);
    positionName = positionObj ? positionObj.name : '';
  } else if (isHexId(positionName)) {
    positionName = '';
  }

  // Get businessCategory name if businessCategory is a valid ObjectId
  let businessCategoryName = user.userDetailId.businessCategory;
  if (user.userDetailId.businessCategory && mongoose.Types.ObjectId.isValid(user.userDetailId.businessCategory)) {
    const businessCat = await BusinessCategory.findById(user.userDetailId.businessCategory);
    businessCategoryName = businessCat ? businessCat.name : '';
  } else if (isHexId(businessCategoryName)) {
    businessCategoryName = '';
  }
  
  const userDetailObj = user.userDetailId.toObject();
  
  // Replace IDs with names
  const profile = {
    phoneNumber: user.phoneNumber,
    currentLocation: user.currentLocation,
    email: userDetailObj.email,
    password: userDetailObj.originalPassword || userDetailObj.password,
    originalid: user._id,
    role: user.role || 'user', // Include user role
    ...userDetailObj,
    city: cityName, // Replace city ID with city name
    company: companyName, // Replace company ID with company name
    industry: industryName, // Replace industry ID with company name
    position: positionName, // Replace position ID with position name
    businessCategory: businessCategoryName, // Replace businessCategory ID with name
    businessCategoryId: userDetailObj.businessCategory, // Preserve original ID
  };
  
  success(res, { profile });
});

const createProfile = asyncHandler(async (req, res) => {
  // Approval status/reason are admin-controlled only — never trust these from the client
  delete req.body.businessApprovalStatus;
  delete req.body.businessRejectionReason;

  const isBusiness = req.body.isBusinessProfile === 'true' || req.body.isBusinessProfile === true;

  if (!isBusiness) {
    const { error } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  } else {
    if (!req.body.businessName) return res.status(400).json({ success: false, message: 'Business Name is required' });
    if (!req.body.businessCategory) return res.status(400).json({ success: false, message: 'Business Category is required' });
    if (!req.body.city) return res.status(400).json({ success: false, message: 'City is required' });
    if (!req.body.pincode) return res.status(400).json({ success: false, message: 'Pincode is required' });
    if (!req.body.email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!req.body.contactPerson) return res.status(400).json({ success: false, message: 'Contact Person is required' });
  }

  const profileImage = req.files?.profileImage?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;
  const businessDocument = req.files?.businessDocument?.[0]?.path || null;

  // Get user - check token first, then userId/phoneNumber from body
  let user = null;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  console.log("Token",token)
  if (token) {
    // If token is provided, verify it and get user
    try {
      const decoded = verifyToken(token);
      user = await User.findById(decoded.id).populate('userDetailId');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } else {
    // If no token, try to get user from request body
    const { userId, phoneNumber } = req.body;
    
    if (userId) {
      user = await User.findById(userId).populate('userDetailId');
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber }).populate('userDetailId');
    }
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'User ID or phone number is required' });
    }
  }
  
  // Check if email already exists (excluding current user's email)
  if (user.userDetailId && user.userDetailId.email !== req.body.email) {
    const isUserExists = await UserDetail.findOne({ email: req.body.email });
    if (isUserExists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  } else if (!user.userDetailId) {
    const isUserExists = await UserDetail.findOne({ email: req.body.email });
    if (isUserExists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  }
  console.log("Profile create api")
  if (req.body.isPrivateProfile !== undefined) {
    req.body.isPrivateProfile = req.body.isPrivateProfile === 'true' || req.body.isPrivateProfile === true;
  }
  let detail;
  if (user.userDetailId) {
    // Update existing profile and mark as complete
    const updateData = isBusiness ? {
      ...req.body,
      isBusinessProfile: true,
      businessLogo: profileImage || user.userDetailId.businessLogo || user.userDetailId.profileImage,
      businessCoverImage: coverImage || user.userDetailId.businessCoverImage || user.userDetailId.coverImage,
      businessDocument: businessDocument || user.userDetailId.businessDocument,
      // Re-submitting a document after a rejection puts it back up for review
      ...(businessDocument && user.userDetailId.businessApprovalStatus === 'rejected'
        ? { businessApprovalStatus: 'pending' }
        : {}),
      lastCompletedStep: 3,
      isProfileComplete: true,
    } : {
      ...req.body,
      profileImage: profileImage || user.userDetailId.profileImage,
      coverImage: coverImage || user.userDetailId.coverImage,
      habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
      interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
      sports: Array.isArray(req.body.sports) ? req.body.sports : (req.body.sports?.split(',').map(s => s.trim()).filter(Boolean) || []),
      preferredLanguage: Array.isArray(req.body.preferredLanguage) ? req.body.preferredLanguage : (req.body.preferredLanguage?.split(',').map(l => l.trim()).filter(Boolean) || []),
      lastCompletedStep: 9,
      isProfileComplete: true,
    };
    detail = await UserDetail.findByIdAndUpdate(
      user.userDetailId._id,
      updateData,
      { new: true }
    );
  } else {
    // Create new profile
    const createData = isBusiness ? {
      ...req.body,
      isBusinessProfile: true,
      businessLogo: profileImage,
      businessCoverImage: coverImage,
      businessDocument,
      lastCompletedStep: 3,
      isProfileComplete: true,
    } : {
      ...req.body,
      profileImage,
      coverImage,
      habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
      interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
      sports: Array.isArray(req.body.sports) ? req.body.sports : (req.body.sports?.split(',').map(s => s.trim()).filter(Boolean) || []),
      preferredLanguage: Array.isArray(req.body.preferredLanguage) ? req.body.preferredLanguage : (req.body.preferredLanguage?.split(',').map(l => l.trim()).filter(Boolean) || []),
      lastCompletedStep: 9,
      isProfileComplete: true,
    };
    detail = await UserDetail.create(createData);
    await User.findByIdAndUpdate(user._id, { userDetailId: detail._id });
  }
  
  const updatedUser = await User.findById(user._id);
  console.log("UpdatedUser data",updatedUser)
  const profile = {
    phoneNumber: updatedUser.phoneNumber,
    email: detail.email,
    ...detail.toObject(),
  };
  console.log("Details email",detail)
  success(res, { profile }, 'Profile completed');

  // Fire welcome email + SMS outside the request lifecycle
  setImmediate(async () => {
    const displayName = isBusiness ? detail.businessName : detail.fullName;
    if (detail.email && displayName) {
      try {
        let token = detail.emailVerificationToken;
        if (!token) {
          const crypto = require('crypto');
          token = crypto.randomBytes(32).toString('hex');
          await UserDetail.findByIdAndUpdate(detail._id, { emailVerificationToken: token });
        }
        const backendUrl = process.env.BACKEND_URL || 'https://api.connect.in';
        const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;
        await sendRegistrationEmail(detail.email, displayName, verificationUrl);
      } catch (err) {
        console.error("Error sending registration email with verification:", err);
      }
    }
    if (updatedUser.phoneNumber && displayName) {
      sendRegistrationSms(updatedUser.phoneNumber, displayName);
    }
  });
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const loggedInUserId = req.user ? req.user._id : null;
  const profile = await getPublicProfile(id, loggedInUserId);
  success(res, { profile });
});

const getMemberDirectory = asyncHandler(async (req, res) => {
  const letter = (req.query.letter || 'A').toUpperCase();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
  const type = req.query.type || 'all'; // 'all', 'individual', 'business'
  const search = req.query.search ? req.query.search.trim() : '';

  // Get active users who have completed their profiles
  const activeUsers = await User.find({
    isActive: { $ne: false },
    userDetailId: { $ne: null }
  }).select('_id userDetailId');

  const activeDetailIdMap = new Map();
  activeUsers.forEach(u => {
    if (u.userDetailId) {
      activeDetailIdMap.set(u.userDetailId.toString(), u._id);
    }
  });

  const activeDetailIds = Array.from(activeDetailIdMap.keys());

  // Base filter for UserDetail
  const detailQuery = {
    _id: { $in: activeDetailIds },
    isProfileComplete: true,
    isPrivateProfile: { $ne: true },
  };

  if (type === 'business') {
    detailQuery.isBusinessProfile = true;
  } else if (type === 'individual') {
    detailQuery.isBusinessProfile = { $ne: true };
  }

  // Letter filter
  if (letter && letter !== 'ALL') {
    if (letter === '#') {
      const nonAlphaRegex = /^[^a-zA-Z]/;
      detailQuery.$or = [
        {
          isBusinessProfile: true,
          $or: [
            { businessName: { $regex: nonAlphaRegex } },
            { businessName: { $in: [null, ''] }, fullName: { $regex: nonAlphaRegex } }
          ]
        },
        {
          isBusinessProfile: { $ne: true },
          fullName: { $regex: nonAlphaRegex }
        }
      ];
    } else {
      const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const letterRegex = new RegExp(`^${escapedLetter}`, 'i');
      detailQuery.$or = [
        {
          isBusinessProfile: true,
          $or: [
            { businessName: { $regex: letterRegex } },
            { businessName: { $in: [null, ''] }, fullName: { $regex: letterRegex } }
          ]
        },
        {
          isBusinessProfile: { $ne: true },
          fullName: { $regex: letterRegex }
        }
      ];
    }
  }

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchCondition = {
      $or: [
        { fullName: { $regex: searchRegex } },
        { businessName: { $regex: searchRegex } },
        { position: { $regex: searchRegex } },
        { company: { $regex: searchRegex } },
        { skills: { $in: [searchRegex] } },
      ]
    };
    if (detailQuery.$or) {
      detailQuery.$and = [
        { $or: detailQuery.$or },
        searchCondition
      ];
      delete detailQuery.$or;
    } else {
      detailQuery.$or = searchCondition.$or;
    }
  }

  const total = await UserDetail.countDocuments(detailQuery);

  const userDetails = await UserDetail.find(detailQuery)
    .populate('city', 'name')
    .populate('businessCategory', 'name')
    .sort({ isBusinessProfile: -1, businessName: 1, fullName: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Resolve industry, company, position names if they are stored as ObjectIds
  const industryIds = [];
  const companyIds = [];
  const positionIds = [];

  userDetails.forEach(d => {
    if (d.industry && mongoose.Types.ObjectId.isValid(d.industry)) industryIds.push(d.industry);
    if (d.company && mongoose.Types.ObjectId.isValid(d.company)) companyIds.push(d.company);
    if (d.position && mongoose.Types.ObjectId.isValid(d.position)) positionIds.push(d.position);
  });

  const [industries, companies, positions] = await Promise.all([
    industryIds.length > 0 ? Industry.find({ _id: { $in: industryIds } }).select('_id name').lean() : [],
    companyIds.length > 0 ? Company.find({ _id: { $in: companyIds } }).select('_id name').lean() : [],
    positionIds.length > 0 ? Position.find({ _id: { $in: positionIds } }).select('_id name').lean() : [],
  ]);

  const industryMap = new Map(industries.map(i => [i._id.toString(), i.name]));
  const companyMap = new Map(companies.map(c => [c._id.toString(), c.name]));
  const positionMap = new Map(positions.map(p => [p._id.toString(), p.name]));
  const isHexId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());

  const members = userDetails.map(d => {
    const userId = activeDetailIdMap.get(d._id.toString()) || d._id;
    const isBusiness = d.isBusinessProfile === true;
    const name = isBusiness ? (d.businessName || d.fullName || 'Business Member') : (d.fullName || 'Member');
    const image = isBusiness ? (d.businessLogo || d.profileImage) : d.profileImage;
    const cityName = d.city && typeof d.city === 'object' ? d.city.name : (d.cityName || null);
    const categoryName = d.businessCategory && typeof d.businessCategory === 'object' ? d.businessCategory.name : null;

    const industryName = d.industry ? (industryMap.get(d.industry.toString()) || (isHexId(d.industry) ? '' : d.industry)) : '';
    const companyName = d.company ? (companyMap.get(d.company.toString()) || (isHexId(d.company) ? '' : d.company)) : '';
    const positionName = d.position ? (positionMap.get(d.position.toString()) || (isHexId(d.position) ? '' : d.position)) : '';

    return {
      _id: userId,
      userDetailId: d._id,
      name,
      fullName: d.fullName,
      businessName: d.businessName,
      isBusinessProfile: isBusiness,
      profileImage: image,
      gender: d.gender,
      dateOfBirth: d.dateOfBirth,
      industry: industryName,
      position: positionName,
      company: companyName,
      businessTagline: d.businessTagline || '',
      businessDescription: d.businessDescription || '',
      cityName,
      categoryName,
      skills: Array.isArray(d.skills) ? d.skills.slice(0, 5) : [],
      verified: isBusiness && d.businessApprovalStatus === 'approved',
      profileUrl: `/profile/${userId}`
    };
  });

  // Calculate counts by letter for the A-Z alphabet bar
  let countsByLetter = {};
  try {
    const alphabetCounts = await UserDetail.aggregate([
      {
        $match: {
          _id: { $in: activeDetailIds },
          isProfileComplete: true,
          isPrivateProfile: { $ne: true },
          ...(type === 'business' ? { isBusinessProfile: true } : {}),
          ...(type === 'individual' ? { isBusinessProfile: { $ne: true } } : {}),
        }
      },
      {
        $project: {
          displayName: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isBusinessProfile', true] },
                  { $gt: [{ $strLenCP: { $ifNull: ['$businessName', ''] } }, 0] }
                ]
              },
              '$businessName',
              { $ifNull: ['$fullName', ''] }
            ]
          }
        }
      },
      {
        $project: {
          firstLetter: {
            $toUpper: { $substrCP: ['$displayName', 0, 1] }
          }
        }
      },
      {
        $group: {
          _id: '$firstLetter',
          count: { $sum: 1 }
        }
      }
    ]);

    alphabetCounts.forEach(item => {
      if (item._id) {
        countsByLetter[item._id] = item.count;
      }
    });
  } catch (aggErr) {
    console.error('Error calculating alphabet counts:', aggErr);
  }

  success(res, {
    members,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    letter,
    type,
    countsByLetter
  });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const hasFiles = req.files && (
    (req.files.profileImage && req.files.profileImage.length > 0) ||
    (req.files.coverImage && req.files.coverImage.length > 0) ||
    (req.files.businessDocument && req.files.businessDocument.length > 0)
  );

  if (Object.keys(req.body).length > 0 || !hasFiles) {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // Approval status/reason are admin-controlled only — never trust these from the client
  delete req.body.businessApprovalStatus;
  delete req.body.businessRejectionReason;

  const updates = req.body;
  const files = req.files;

  const updatedProfile = await updateProfile(req.user._id, updates, files);
  
  // Get city name
  let cityName = null;
  if (updatedProfile.city) {
    if (typeof updatedProfile.city === 'object' && updatedProfile.city.name) {
      // City is populated
      cityName = updatedProfile.city.name;
    } else if (mongoose.Types.ObjectId.isValid(updatedProfile.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(updatedProfile.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = updatedProfile.company;
  if (updatedProfile.company && mongoose.Types.ObjectId.isValid(updatedProfile.company)) {
    const company = await Company.findById(updatedProfile.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  // Get industry name if industry is a valid ObjectId
  let industryName = updatedProfile.industry;
  if (updatedProfile.industry && mongoose.Types.ObjectId.isValid(updatedProfile.industry)) {
    const industry = await Industry.findById(updatedProfile.industry);
    if (industry) {
      industryName = industry.name;
    }
  }

  // Get position name if position is a valid ObjectId
  let positionName = updatedProfile.position;
  if (updatedProfile.position && mongoose.Types.ObjectId.isValid(updatedProfile.position)) {
    const positionObj = await Position.findById(updatedProfile.position);
    if (positionObj) {
      positionName = positionObj.name;
    }
  }
  
  // Replace IDs with names in the response
  const profileWithNames = {
    ...updatedProfile,
    city: cityName,
    company: companyName,
    industry: industryName,
    position: positionName,
  };
  
  success(res, { profile: profileWithNames }, 'Profile updated');
});

const logout = asyncHandler(async (req, res) => {
  success(res, null, 'Logged out successfully');
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  await deleteAccount(req.user._id);
  success(res, null, 'Account deleted successfully');
});

// Save profile step data (progressive saving)
const saveProfileStep = asyncHandler(async (req, res) => {
  // stepNumber comes from FormData, so it might be a string
  const stepNumber = parseInt(req.body.stepNumber, 10);
  const profileImage = req.files?.profileImage?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;
  const businessDocument = req.files?.businessDocument?.[0]?.path || null;

  const user = await User.findById(req.user._id).populate('userDetailId');
  const isBusiness = req.body.isBusinessProfile === 'true' || req.body.isBusinessProfile === true || (user.userDetailId && user.userDetailId.isBusinessProfile === true);

  if (isBusiness) {
    if (!stepNumber || isNaN(stepNumber) || stepNumber < 1 || stepNumber > 3) {
      return res.status(400).json({ success: false, message: 'Invalid business step number' });
    }
  } else {
    if (!stepNumber || isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
      return res.status(400).json({ success: false, message: 'Invalid step number' });
    }
  }

  // Prepare step data (only include fields for this step)
  const stepData = {};
  
  if (isBusiness) {
    stepData.isBusinessProfile = true;
    
    // Step 1: Business Name, Business Logo, Cover Image, Business Tagline, Business Category
    if (stepNumber === 1) {
      if (req.body.businessName) stepData.businessName = req.body.businessName;
      if (req.body.businessTagline !== undefined) stepData.businessTagline = req.body.businessTagline;
      if (req.body.businessCategory) stepData.businessCategory = req.body.businessCategory;
      if (profileImage) stepData.businessLogo = profileImage;
      if (coverImage) stepData.businessCoverImage = coverImage;
      if (businessDocument) {
        stepData.businessDocument = businessDocument;
        // Re-submitting a document after a rejection puts it back up for review
        if (user.userDetailId && user.userDetailId.businessApprovalStatus === 'rejected') {
          stepData.businessApprovalStatus = 'pending';
        }
      }
    }
    
    // Step 2: Contact Person, WhatsApp Number, Email Address, Website URL, City, Pincode
    if (stepNumber === 2) {
      if (req.body.contactPerson) stepData.contactPerson = req.body.contactPerson;
      if (req.body.whatsappNumber) stepData.whatsappNumber = req.body.whatsappNumber;
      if (req.body.email) stepData.email = req.body.email;
      if (req.body.website !== undefined) stepData.website = req.body.website;
      if (req.body.city) stepData.city = req.body.city;
      if (req.body.pincode) stepData.pincode = req.body.pincode;
    }
    
    // Step 3: Facebook, Instagram, LinkedIn, Youtube, Twitter
    if (stepNumber === 3) {
      if (req.body.facebook !== undefined) stepData.facebook = req.body.facebook;
      if (req.body.instagram !== undefined) stepData.instagram = req.body.instagram;
      if (req.body.linkedIn !== undefined) stepData.linkedIn = req.body.linkedIn;
      if (req.body.youtube !== undefined) stepData.youtube = req.body.youtube;
      if (req.body.twitter !== undefined) stepData.twitter = req.body.twitter;
    }
  } else {
    // Step 1: Basic info
    if (stepNumber === 1) {
      if (req.body.fullName) stepData.fullName = req.body.fullName;
      if (req.body.city) stepData.city = req.body.city;
      if (req.body.pincode) stepData.pincode = req.body.pincode;
      if (req.body.religion) stepData.religion = req.body.religion;
      if (req.body.status) stepData.status = req.body.status;
    }
    
    // Step 2: Personal details
    if (stepNumber === 2) {
      if (req.body.email) stepData.email = req.body.email;
      if (req.body.gender) stepData.gender = req.body.gender;
      if (req.body.dateOfBirth) {
        stepData.dateOfBirth = req.body.dateOfBirth instanceof Date 
          ? req.body.dateOfBirth 
          : new Date(req.body.dateOfBirth);
      }
    }
    
    // Step 3: Language
    if (stepNumber === 3) {
      if (req.body.preferredLanguage) {
        stepData.preferredLanguage = Array.isArray(req.body.preferredLanguage)
          ? req.body.preferredLanguage
          : (req.body.preferredLanguage.split(',').map(l => l.trim()).filter(Boolean) || []);
      }
    }
    
    // Step 4: Habits
    if (stepNumber === 4) {
      if (req.body.habits) {
        stepData.habits = Array.isArray(req.body.habits) 
          ? req.body.habits 
          : (req.body.habits.split(',').map(h => h.trim()).filter(Boolean) || []);
      }
    }
    
    // Step 5: Interests
    if (stepNumber === 5) {
      if (req.body.interests) {
        stepData.interests = Array.isArray(req.body.interests) 
          ? req.body.interests 
          : (req.body.interests.split(',').map(i => i.trim()).filter(Boolean) || []);
      }
    }
    
    // Step 6: Skills
    if (stepNumber === 6) {
      if (req.body.skills) {
        stepData.skills = Array.isArray(req.body.skills) 
          ? req.body.skills 
          : (req.body.skills.split(',').map(s => s.trim()).filter(Boolean) || []);
      }
    }
    
    // Step 7: Sports
    if (stepNumber === 7) {
      if (req.body.sports) {
        stepData.sports = Array.isArray(req.body.sports) 
          ? req.body.sports 
          : (req.body.sports.split(',').map(s => s.trim()).filter(Boolean) || []);
      }
    }
    
    // Step 8: Industry and Company
    if (stepNumber === 8) {
      if (req.body.industry) stepData.industry = req.body.industry;
      if (req.body.company) stepData.company = req.body.company;
      if (req.body.position !== undefined) stepData.position = req.body.position;
    }
    
    // Step 9: Profile Image
    if (stepNumber === 9 && profileImage) {
      stepData.profileImage = profileImage;
    }
  }
  
  // Update lastCompletedStep
  stepData.lastCompletedStep = stepNumber;
  
  // If final step is completed, mark profile as complete
  const finalStep = isBusiness ? 3 : 9;
  if (stepNumber === finalStep) {
    stepData.isProfileComplete = true;
  }
  
  let userDetail;
  if (user.userDetailId) {
    // Update existing profile - use $set to update only provided fields, preserving existing ones
    const updateObj = {
      ...stepData,
      lastCompletedStep: stepNumber,
    };
    
    if (stepNumber === finalStep) {
      updateObj.isProfileComplete = true;
    }
    
    userDetail = await UserDetail.findByIdAndUpdate(
      user.userDetailId._id,
      { $set: updateObj },
      { new: true, runValidators: false } // Don't validate incomplete data
    );
  } else {
    // Create new profile
    userDetail = await UserDetail.create({
      ...stepData,
      lastCompletedStep: stepNumber,
      isProfileComplete: stepNumber === finalStep ? true : false,
    });
    await User.findByIdAndUpdate(req.user._id, { userDetailId: userDetail._id });
  }
  
  success(res, {
    profile: userDetail,
    lastCompletedStep: stepNumber
  }, 'Step saved successfully');
});

// Get profile progress (last completed step)
const getProfileProgress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  
  if (!user.userDetailId) {
    return success(res, { 
      lastCompletedStep: 0, 
      profile: null,
      isProfileComplete: false 
    });
  }
  
  // Fetch fresh data from database to ensure all fields are included
  const userDetail = await UserDetail.findById(user.userDetailId._id).populate('city');
  
  if (!userDetail) {
    return success(res, { 
      lastCompletedStep: 0, 
      profile: null,
      isProfileComplete: false 
    });
  }
  
  // Get city name
  let cityName = null;
  if (userDetail.city) {
    if (typeof userDetail.city === 'object' && userDetail.city.name) {
      // City is populated
      cityName = userDetail.city.name;
    } else if (mongoose.Types.ObjectId.isValid(userDetail.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(userDetail.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = userDetail.company;
  if (userDetail.company && mongoose.Types.ObjectId.isValid(userDetail.company)) {
    const company = await Company.findById(userDetail.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  // Get industry name if industry is a valid ObjectId
  let industryName = userDetail.industry;
  if (userDetail.industry && mongoose.Types.ObjectId.isValid(userDetail.industry)) {
    const industry = await Industry.findById(userDetail.industry);
    if (industry) {
      industryName = industry.name;
    }
  }

  // Get position name if position is a valid ObjectId
  let positionName = userDetail.position;
  if (userDetail.position && mongoose.Types.ObjectId.isValid(userDetail.position)) {
    const positionObj = await Position.findById(userDetail.position);
    if (positionObj) {
      positionName = positionObj.name;
    }
  }

  // Get businessCategory name if businessCategory is a valid ObjectId
  let businessCategoryName = userDetail.businessCategory;
  if (userDetail.businessCategory && mongoose.Types.ObjectId.isValid(userDetail.businessCategory)) {
    const businessCat = await BusinessCategory.findById(userDetail.businessCategory);
    if (businessCat) {
      businessCategoryName = businessCat.name;
    }
  }
  
  // Convert to plain object with all fields, including undefined ones
  const profileData = userDetail.toObject({ 
    virtuals: false,
    transform: (doc, ret) => {
      // Ensure all fields are included, even if undefined
      return ret;
    }
  });
  
  // Replace IDs with names
  profileData.city = cityName;
  profileData.company = companyName;
  profileData.industry = industryName;
  profileData.position = positionName;
  profileData.businessCategory = businessCategoryName;
  profileData.businessCategoryId = userDetail.businessCategory;
  profileData.phoneNumber = user.phoneNumber;
  
  success(res, {
    lastCompletedStep: profileData.lastCompletedStep || 0,
    profile: profileData,
    isProfileComplete: profileData.isProfileComplete || false
  });
});

module.exports = {
  getProfile,
  createProfile,
  getUserProfileById,
  getMemberDirectory,
  updateUserProfile,
  logout,
  deleteUserAccount,
  saveProfileStep,
  getProfileProgress,
};