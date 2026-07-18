const CityModel = require("../models/City.model");
const CompanyModel = require("../models/Company.model");
const HabitModel = require("../models/Habit.model");
const IndustryModel = require("../models/Industry.model");
const InterestModel = require("../models/Interest.model");
const SkillModel = require("../models/Skill.model");
const CardModel = require("../models/Card.model");
const AuthBannerModel = require("../models/AuthBanner.model");
const SportModel = require("../models/Sport.model");
const PositionModel = require("../models/Position.model");
const SettingModel = require("../models/Setting.model");
const CardClickModel = require("../models/CardClick.model");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");

const resolvePositionName = async (position) => {
  if (!position) return "";
  if (/^[0-9a-fA-F]{24}$/.test(position)) {
    const posDoc = await PositionModel.findById(position);
    if (posDoc) {
      return posDoc.name.toLowerCase().trim();
    }
  }
  return position.toLowerCase().trim();
};


const listCityCtrl = asyncHandler(async (req, res) => {
  const city = await CityModel.find().sort({ isMetro: -1, name: 1 });
  success(res, { city }, 'City list fetched');
});

const listSkillCtrl = asyncHandler(async (req, res) => {
  const skills = await SkillModel.find()
  success(res, { skills }, 'skills list fetched');
});

const listSportCtrl = asyncHandler(async (req, res) => {
  const sports = await SportModel.find({ isActive: true }).sort({ name: 1 });
  success(res, { sports }, 'sports list fetched');
});

const listInterestCtrl = asyncHandler(async (req, res) => {
  const interests = await InterestModel.find()
  success(res, { interests }, 'interests list fetched');
});

const listHabitsCtrl = asyncHandler(async (req, res) => {
  const habits = await HabitModel.find()
  success(res, { habits }, 'habits list fetched');
})

  const listCompaniesCtrl = asyncHandler(async (req, res) => {
    const { industryId } = req.query;
    
    // Build query - filter by industryId if provided
    let query = {};
    if (industryId && industryId.trim()) {
      query.industry = industryId.trim();
    }
    
    const companies = await CompanyModel.find(query)
      .populate({
        path: 'industry',
        select: '_id name description isActive createdAt updatedAt'
      })
      .sort({ name: 1 }); // Sort alphabetically
    
    success(res, { companies }, 'companies list fetched');
  })
  const listIndustriesCtrl = asyncHandler(async (req, res) => {
    const industries = await IndustryModel.find()
    success(res, { industries }, 'industries list fetched');
  })

  const listCardsCtrl = asyncHandler(async (req, res) => {
    const { search } = req.query;
    
    // Build query - always filter by isActive: true
    let query = { isActive: true };
    
    // Add search by card name if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.name = searchRegex;
    }
    
    const cards = await CardModel.find(query)
      .sort({ createdAt: -1 }); // Sort by newest first

    // Filter by user eligibility
    const user = await req.user.populate({
      path: 'userDetailId',
      populate: { path: 'city', select: 'name' }
    });
    
    const userDetail = user.userDetailId;
    if (!userDetail) {
      return success(res, { cards: [] }, 'cards list fetched');
    }

    // Calculate user age
    let userAge = null;
    if (userDetail.dateOfBirth) {
      const birthDate = new Date(userDetail.dateOfBirth);
      const today = new Date();
      userAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        userAge--;
      }
    }

    const userCity = userDetail.city?.name?.toLowerCase().trim() || "";
    const userPosition = await resolvePositionName(userDetail.position);

    const eligibleCards = cards.filter(card => {
      // Age check
      if (card.targetAgeMin !== null && card.targetAgeMin !== undefined && card.targetAgeMin > 0) {
        if (userAge === null || userAge < card.targetAgeMin) return false;
      }
      if (card.targetAgeMax !== null && card.targetAgeMax !== undefined && card.targetAgeMax > 0) {
        if (userAge === null || userAge > card.targetAgeMax) return false;
      }
      
      // City check
      if (card.targetCities && card.targetCities.length > 0) {
        if (!userCity) return false;
        const normalizedCities = card.targetCities.map(c => c.toLowerCase().trim());
        if (!normalizedCities.includes(userCity)) return false;
      }
      
      // Position check
      if (card.targetPositions && card.targetPositions.length > 0) {
        if (!userPosition) return false;
        const normalizedPositions = card.targetPositions.map(p => p.toLowerCase().trim());
        if (!normalizedPositions.includes(userPosition)) return false;
      }
      
      return true;
    });

    success(res, { cards: eligibleCards }, 'cards list fetched');
  })

const getPopupOfferCtrl = asyncHandler(async (req, res) => {
  // 1. Check if popup is enabled globally
  const setting = await SettingModel.findOne({ key: 'isPopupEnabled' });
  const isPopupEnabled = setting ? setting.value : true; // default to true
  
  if (!isPopupEnabled) {
    return success(res, { showPopup: false, offer: null }, 'Popup is disabled globally');
  }

  // 2. Fetch user detail
  const user = await req.user.populate({
    path: 'userDetailId',
    populate: { path: 'city', select: 'name' }
  });
  
  const userDetail = user.userDetailId;
  if (!userDetail) {
    return success(res, { showPopup: false, offer: null }, 'User detail not found');
  }

  // 3. Check if user already saw an offer in the last 24 hours
  if (userDetail.lastOfferShownAt) {
    const diffMs = Date.now() - userDetail.lastOfferShownAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      return success(res, { showPopup: false, offer: null }, 'Already shown an offer in the last 24 hours');
    }
  }

  // 4. Find all active offers (cards)
  const cards = await CardModel.find({ isActive: true });
  if (cards.length === 0) {
    return success(res, { showPopup: false, offer: null }, 'No active offers available');
  }

  // 5. Filter eligible offers
  const eligibleOffers = [];
  
  // Calculate user age
  let userAge = null;
  if (userDetail.dateOfBirth) {
    const birthDate = new Date(userDetail.dateOfBirth);
    const today = new Date();
    userAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      userAge--;
    }
  }

  const userCity = userDetail.city?.name?.toLowerCase().trim() || "";
  const userPosition = await resolvePositionName(userDetail.position);

  for (const card of cards) {
    // Age check
    if (card.targetAgeMin !== null && card.targetAgeMin !== undefined && card.targetAgeMin > 0) {
      if (userAge === null || userAge < card.targetAgeMin) continue;
    }
    if (card.targetAgeMax !== null && card.targetAgeMax !== undefined && card.targetAgeMax > 0) {
      if (userAge === null || userAge > card.targetAgeMax) continue;
    }
    
    // City check
    if (card.targetCities && card.targetCities.length > 0) {
      if (!userCity) continue;
      const normalizedCities = card.targetCities.map(c => c.toLowerCase().trim());
      if (!normalizedCities.includes(userCity)) continue;
    }
    
    // Position check
    if (card.targetPositions && card.targetPositions.length > 0) {
      if (!userPosition) continue;
      const normalizedPositions = card.targetPositions.map(p => p.toLowerCase().trim());
      if (!normalizedPositions.includes(userPosition)) continue;
    }
    
    eligibleOffers.push(card);
  }

  if (eligibleOffers.length === 0) {
    return success(res, { showPopup: false, offer: null }, 'No eligible offers found for this user');
  }

  // 6. Filter unseen eligible offers
  const shownIds = userDetail.shownOfferIds || [];
  const shownIdStrings = shownIds.map(id => id.toString());
  
  let unseenOffers = eligibleOffers.filter(offer => !shownIdStrings.includes(offer._id.toString()));
  
  let selectedOffer = null;
  
  if (unseenOffers.length > 0) {
    // Pick the first unseen offer
    selectedOffer = unseenOffers[0];
    userDetail.shownOfferIds.push(selectedOffer._id);
  } else {
    // All eligible offers have been shown. Reset the cycle.
    userDetail.shownOfferIds = [];
    selectedOffer = eligibleOffers[0];
    userDetail.shownOfferIds.push(selectedOffer._id);
  }

  // Update last shown timestamp
  userDetail.lastOfferShownAt = new Date();
  await userDetail.save();

  // Return the selected offer
  return success(res, { showPopup: true, offer: selectedOffer }, 'Eligible offer fetched successfully');
});

const clickCardCtrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const card = await CardModel.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true }
  );
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  // Log user click
  if (req.user) {
    await CardClickModel.create({
      cardId: card._id,
      userId: req.user._id
    });
  }

  return success(res, { clicks: card.clicks }, 'Card click counted successfully');
});


const listAuthBannersCtrl = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const query = { isActive: true };
  if (type && ['desktop', 'mobile'].includes(type)) {
    query.type = type;
  }
  const banners = await AuthBannerModel.find(query).lean();
  success(res, { banners }, 'auth banners fetched');
});

const listPositionsCtrl = asyncHandler(async (req, res) => {
  const positions = await PositionModel.find({ isActive: true }).sort({ name: 1 });
  success(res, { positions }, 'positions list fetched');
});

module.exports = {
  listCityCtrl,
  listSkillCtrl,
  listInterestCtrl,
  listHabitsCtrl,
  listCompaniesCtrl,
  listIndustriesCtrl,
  listCardsCtrl,
  listAuthBannersCtrl,
  listSportCtrl,
  listPositionsCtrl,
  getPopupOfferCtrl,
  clickCardCtrl,
};
