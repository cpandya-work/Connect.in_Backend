const express = require('express');
const {
  getOffersCtrl,
  getOfferByIdCtrl,
} = require('../controllers/offers.controller');

const router = express.Router();

router.get('/', getOffersCtrl);

module.exports = router;