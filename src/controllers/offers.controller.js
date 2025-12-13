const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getOffers, getOfferById } = require('../services/offers.service');

const getOffersCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const offers = await getOffers(search);
  success(res, { offers }, 'Offers fetched successfully');
});

module.exports = { getOffersCtrl };