const Joi = require('joi');

const inquirySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('').messages({
    'string.pattern.base': 'Phone number must be exactly 10 digits',
  }),
  subject: Joi.string().min(3).max(200).required().messages({
    'string.min': 'Subject must be at least 3 characters',
    'string.max': 'Subject must not exceed 200 characters',
    'any.required': 'Subject is required',
  }),
  message: Joi.string().min(10).max(2000).required().messages({
    'string.min': 'Message must be at least 10 characters',
    'string.max': 'Message must not exceed 2000 characters',
    'any.required': 'Message is required',
  }),
});

module.exports = { inquirySchema };

