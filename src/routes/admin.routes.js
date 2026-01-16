const express = require('express');
const { 
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
  sendBroadcastNotificationCtrl
} = require('../controllers/admin.controller');
const { isAdmin } = require('../middlewares/admin.middleware');
const uploadCardLogo = require('../middlewares/cardUpload.middleware');

const router = express.Router();

// All admin routes require admin authentication
router.use(isAdmin);

// User management routes
// GET /api/admin/users?page=1&limit=10&search=john
router.get('/users', getUsersListCtrl);

// Skill management routes
// GET /api/admin/skills?page=1&limit=10&search=javascript&isActive=true
router.get('/skills', getSkillsListCtrl);

// GET /api/admin/skills/:id
router.get('/skills/:id', getSkillByIdCtrl);

// POST /api/admin/skills
router.post('/skills', createSkillCtrl);

// PUT /api/admin/skills/:id
router.put('/skills/:id', updateSkillCtrl);

// DELETE /api/admin/skills/:id
router.delete('/skills/:id', deleteSkillCtrl);

// Interest management routes
// GET /api/admin/interests?page=1&limit=10&search=reading&isActive=true
router.get('/interests', getInterestsListCtrl);

// GET /api/admin/interests/:id
router.get('/interests/:id', getInterestByIdCtrl);

// POST /api/admin/interests
router.post('/interests', createInterestCtrl);

// PUT /api/admin/interests/:id
router.put('/interests/:id', updateInterestCtrl);

// DELETE /api/admin/interests/:id
router.delete('/interests/:id', deleteInterestCtrl);

// City management routes
// GET /api/admin/cities?page=1&limit=10&search=mumbai&isActive=true
router.get('/cities', getCitiesListCtrl);

// GET /api/admin/cities/:id
router.get('/cities/:id', getCityByIdCtrl);

// POST /api/admin/cities
router.post('/cities', createCityCtrl);

// PUT /api/admin/cities/:id
router.put('/cities/:id', updateCityCtrl);

// DELETE /api/admin/cities/:id
router.delete('/cities/:id', deleteCityCtrl);

// Habit management routes
// GET /api/admin/habits?page=1&limit=10&search=reading&isActive=true
router.get('/habits', getHabitsListCtrl);

// GET /api/admin/habits/:id
router.get('/habits/:id', getHabitByIdCtrl);

// POST /api/admin/habits
router.post('/habits', createHabitCtrl);

// PUT /api/admin/habits/:id
router.put('/habits/:id', updateHabitCtrl);

// DELETE /api/admin/habits/:id
router.delete('/habits/:id', deleteHabitCtrl);

// Company management routes
// GET /api/admin/companies?page=1&limit=10&search=tech&isActive=true
router.get('/companies', getCompaniesListCtrl);

// GET /api/admin/companies/:id
router.get('/companies/:id', getCompanyByIdCtrl);

// POST /api/admin/companies
router.post('/companies', createCompanyCtrl);

// PUT /api/admin/companies/:id
router.put('/companies/:id', updateCompanyCtrl);

// DELETE /api/admin/companies/:id
router.delete('/companies/:id', deleteCompanyCtrl);

// Industry management routes
// GET /api/admin/industries?page=1&limit=10&search=tech&isActive=true
router.get('/industries', getIndustriesListCtrl);

// GET /api/admin/industries/:id
router.get('/industries/:id', getIndustryByIdCtrl);

// POST /api/admin/industries
router.post('/industries', createIndustryCtrl);

// PUT /api/admin/industries/:id
router.put('/industries/:id', updateIndustryCtrl);

// DELETE /api/admin/industries/:id
router.delete('/industries/:id', deleteIndustryCtrl);

// Card management routes
// GET /api/admin/cards?page=1&limit=10&search=premium&isActive=true
router.get('/cards', getCardsListCtrl);

// GET /api/admin/cards/:id
router.get('/cards/:id', getCardByIdCtrl);

// POST /api/admin/cards - Requires logo_image file upload (uploaded to Cloudinary automatically)
router.post('/cards', uploadCardLogo.single('logo_image'), createCardCtrl);

// PUT /api/admin/cards/:id - Can accept image file or logo_image URL
router.put('/cards/:id', uploadCardLogo.single('logo_image'), updateCardCtrl);

// DELETE /api/admin/cards/:id
router.delete('/cards/:id', deleteCardCtrl);

// Notification management routes
// POST /api/admin/notifications/broadcast - Send push notification to all users
router.post('/notifications/broadcast', sendBroadcastNotificationCtrl);

module.exports = router;
