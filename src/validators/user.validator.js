const Joi = require('joi');

const profileSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  city: Joi.string().hex().length(24).required().messages({
    'string.hex': 'City must be a valid ObjectId',
    'string.length': 'City must be a valid ObjectId',
    'any.required': 'City is required'
  }),
  pincode: Joi.string().regex(/^[1-9][0-9]{5}$/).required().messages({
    'string.pattern.base': 'Pincode must be a valid 6-digit number',
    'any.required': 'Pincode is required'
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
  sports: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  company: Joi.string().allow('').optional(),
  industry: Joi.string().required(),
  position: Joi.string().allow('').optional(),
  coverImage: Joi.string().allow('', null).optional(),
  fastConnect: Joi.boolean().optional(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2),
  city: Joi.string().hex().length(24).messages({
    'string.hex': 'City must be a valid ObjectId',
    'string.length': 'City must be a valid ObjectId'
  }),
  pincode: Joi.string().regex(/^[1-9][0-9]{5}$/).messages({
    'string.pattern.base': 'Pincode must be a valid 6-digit number'
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
  sports: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  company: Joi.string().allow('').optional(),
  industry: Joi.string(),
  position: Joi.string().allow('').optional(),
  coverImage: Joi.string().allow('', null).optional(),
  fastConnect: Joi.boolean().optional(),
  
  // Business Profile fields
  isBusinessProfile: Joi.boolean().optional(),
  businessName: Joi.string().min(2).optional(),
  businessLogo: Joi.string().allow('', null).optional(),
  businessCoverImage: Joi.string().allow('', null).optional(),
  businessTagline: Joi.string().max(160).allow('').optional(),
  businessCategory: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Business category must be a valid ObjectId',
    'string.length': 'Business category must be a valid ObjectId'
  }),
  website: Joi.string().allow('').optional(),
  contactPerson: Joi.string().optional(),
  whatsappNumber: Joi.string().allow('').optional(),
  facebook: Joi.string().allow('').optional(),
  instagram: Joi.string().allow('').optional(),
  linkedIn: Joi.string().allow('').optional(),
  youtube: Joi.string().allow('').optional(),
  twitter: Joi.string().allow('').optional(),
  businessDescription: Joi.string().allow('').optional(),
}).min(1); // at least one field

module.exports = { profileSchema, updateProfileSchema };