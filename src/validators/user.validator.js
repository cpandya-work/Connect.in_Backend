const Joi = require('joi');

const profileSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  city: Joi.string().required(),
  religion: Joi.string().required(),
  status: Joi.string().valid('Married', 'Unmarried', 'Divorced').required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  dateOfBirth: Joi.date().max('now').required(),
  preferredLanguage: Joi.string().required(),
  habits: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  interests: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2),
  city: Joi.string(),
  religion: Joi.string(),
  status: Joi.string().valid('Married', 'Unmarried', 'Divorced'),
  email: Joi.string().email(),
  password: Joi.string().min(6).messages({
    'string.min': 'Password must be at least 6 characters'
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  dateOfBirth: Joi.date().max('now'),
  preferredLanguage: Joi.string(),
  habits: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  interests: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
}).min(1); // at least one field

module.exports = { profileSchema, updateProfileSchema };