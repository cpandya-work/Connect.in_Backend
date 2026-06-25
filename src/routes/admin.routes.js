const express = require('express');
const { 
  getTrafficSourcesStatsCtrl,
  getUsersListCtrl,
  getSkillsListCtrl,
  getSkillByIdCtrl,
  createSkillCtrl,
  updateSkillCtrl,
  deleteSkillCtrl,
  getSportsListCtrl,
  getSportByIdCtrl,
  createSportCtrl,
  updateSportCtrl,
  deleteSportCtrl,
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
  getIncompleteProfileCountCtrl,
  sendIncompleteProfileSmsCtrl,
  getGeneralUserCountCtrl,
  sendGeneralSmsBroadcastCtrl,
  getTargetedEmailUserCountCtrl,
  sendTargetedEmailBroadcastCtrl,
  getDashboardStatsCtrl,
  getPendingPostsCtrl,
  approvePostCtrl,
  rejectPostCtrl,
} = require('../controllers/admin.controller');
const { isAdmin } = require('../middlewares/admin.middleware');
const uploadCardLogo = require('../middlewares/cardUpload.middleware');
const authBannerUpload = require('../middlewares/authBannerUpload.middleware');

const router = express.Router();

// All admin routes require admin authentication
router.use(isAdmin);

// Dashboard stats route
router.get('/dashboard-stats', getDashboardStatsCtrl);
router.get('/traffic-sources', getTrafficSourcesStatsCtrl);

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

// Sport management routes
// GET /api/admin/sports?page=1&limit=10&search=football&isActive=true
router.get('/sports', getSportsListCtrl);

// GET /api/admin/sports/:id
router.get('/sports/:id', getSportByIdCtrl);

// POST /api/admin/sports
router.post('/sports', createSportCtrl);

// PUT /api/admin/sports/:id
router.put('/sports/:id', updateSportCtrl);

// DELETE /api/admin/sports/:id
router.delete('/sports/:id', deleteSportCtrl);

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

// POST /api/admin/notifications/broadcast-offer - Send offer email to all users with emails
router.post('/notifications/broadcast-offer', broadcastOfferEmailCtrl);

// GET /api/admin/notifications/broadcast-incomplete-profile-count - Get count of users with incomplete profiles
router.get('/notifications/broadcast-incomplete-profile-count', getIncompleteProfileCountCtrl);

// POST /api/admin/notifications/broadcast-incomplete-profile-sms - Send SMS to users with incomplete profiles
router.post('/notifications/broadcast-incomplete-profile-sms', sendIncompleteProfileSmsCtrl);

// GET /api/admin/notifications/broadcast-user-count - Get count of all users by registration
router.get('/notifications/broadcast-user-count', getGeneralUserCountCtrl);

// POST /api/admin/notifications/broadcast-general-sms - Send general SMS broadcast
router.post('/notifications/broadcast-general-sms', sendGeneralSmsBroadcastCtrl);

// GET /api/admin/notifications/broadcast-targeted-email-count - Get count of users with emails by registration
router.get('/notifications/broadcast-targeted-email-count', getTargetedEmailUserCountCtrl);

// POST /api/admin/notifications/broadcast-targeted-email - Send targeted HTML email broadcast
router.post('/notifications/broadcast-targeted-email', sendTargetedEmailBroadcastCtrl);


// Auth banner management routes
// GET /api/admin/auth-banners
router.get('/auth-banners', getAuthBannersCtrl);

// POST /api/admin/auth-banners - Requires image file upload
router.post('/auth-banners', authBannerUpload.single('image'), createAuthBannerCtrl);

// DELETE /api/admin/auth-banners/:id
router.delete('/auth-banners/:id', deleteAuthBannerCtrl);

// PATCH /api/admin/auth-banners/:id/toggle
router.patch('/auth-banners/:id/toggle', toggleAuthBannerCtrl);

// Post approval routes
router.get('/posts/pending', getPendingPostsCtrl);
router.put('/posts/:postId/approve', approvePostCtrl);
router.delete('/posts/:postId/reject', rejectPostCtrl);

module.exports = router;
