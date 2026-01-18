const CityModel = require("../models/City.model");
const CompanyModel = require("../models/Company.model");
const HabitModel = require("../models/Habit.model");
const IndustryModel = require("../models/Industry.model");
const InterestModel = require("../models/Interest.model");
const SkillModel = require("../models/Skill.model");
const CardModel = require("../models/Card.model");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");


const listCityCtrl = asyncHandler(async (req, res) => {
  const city = await CityModel.find()
  success(res, { city }, 'City list fetched');
});

const listSkillCtrl = asyncHandler(async (req, res) => {
  const skills = await SkillModel.find()
  success(res, { skills }, 'skills list fetched');
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
    success(res, { cards }, 'cards list fetched');
  })



module.exports = {
  listCityCtrl,
  listSkillCtrl,
  listInterestCtrl,
  listHabitsCtrl,
  listCompaniesCtrl,
  listIndustriesCtrl,
  listCardsCtrl

}
