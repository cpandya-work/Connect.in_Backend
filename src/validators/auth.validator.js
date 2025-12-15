const Joi = require('joi');

const sendOtpSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).required(),
});

const verifyOtpSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).required(),
  otp: Joi.string().length(6).required(),
  fcmToken: Joi.string().optional(),
  deviceType: Joi.string().valid('android', 'ios', 'web').default('android').optional(),
});

module.exports = { sendOtpSchema, verifyOtpSchema };