const Joi = require('joi');

const sendOtpSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+\d{7,15}$/).required().messages({
    'string.pattern.base': 'Please enter valid mobile number with country code (e.g., +911234567890)',
    'any.required': 'Phone number is required'
  }),
});

const verifyOtpSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+\d{7,15}$/).required().messages({
    'string.pattern.base': 'Please enter valid mobile number with country code (e.g., +911234567890)',
    'any.required': 'Phone number is required'
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be 6 digits',
    'any.required': 'OTP is required'
  }),
  fcmToken: Joi.string().optional(),
  deviceType: Joi.string().valid('android', 'ios', 'web').default('android').optional(),
  trafficSource: Joi.string().allow('', null).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  fcmToken: Joi.string().optional(),
  deviceType: Joi.string().valid('android', 'ios', 'web').default('web').optional(),
});

module.exports = { sendOtpSchema, verifyOtpSchema, loginSchema };