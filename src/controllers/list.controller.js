const CityModel = require("../models/City.model");
const InterestModel = require("../models/Interest.model");
const SkillModel = require("../models/Skill.model");
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
  
  

  module.exports ={
    listCityCtrl,
    listSkillCtrl,
    listInterestCtrl

  }
  