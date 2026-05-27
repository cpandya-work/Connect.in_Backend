const Joi = require('joi');

const profileSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  city: Joi.string().hex().length(24).required().messages({
    'string.hex': 'City must be a valid ObjectId',
    'string.length': 'City must be a valid ObjectId',
    'any.required': 'City is required'
  }),
  religion: Joi.string().required(),
  status: Joi.string().valid('Single', 'Married', 'Divorced', 'Prefer not to say').required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).optional().allow('').messages({
    'string.min': 'Password must be at least 6 characters'
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  dateOfBirth: Joi.date().max('now').required(),
  preferredLanguage: Joi.alternatives().try(Joi.array().items(Joi.string()).min(1), Joi.string()).required(),
  habits: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  interests: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  company: Joi.string().allow('').optional(),
  industry: Joi.string().required(),
  fastConnect: Joi.boolean().optional(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2),
  city: Joi.string().hex().length(24).messages({
    'string.hex': 'City must be a valid ObjectId',
    'string.length': 'City must be a valid ObjectId'
  }),
  religion: Joi.string(),
  status: Joi.string().valid('Single', 'Married', 'Divorced', 'Prefer not to say'),
  email: Joi.string().email(),
  password: Joi.string().min(6).messages({
    'string.min': 'Password must be at least 6 characters'
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  dateOfBirth: Joi.date().max('now'),
  preferredLanguage: Joi.alternatives().try(Joi.array().items(Joi.string()).min(1), Joi.string()),
  habits: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  interests: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  company: Joi.string().allow('').optional(),
  industry: Joi.string(),
  fastConnect: Joi.boolean().optional(),
}).min(1); // at least one field

module.exports = { profileSchema, updateProfileSchema };