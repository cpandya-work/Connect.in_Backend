const Joi = require('joi');

const createCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name must not exceed 100 characters',
    'any.required': 'Company name is required',
    'string.empty': 'Company name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  industry: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Industry ID must be a valid MongoDB ObjectId',
    'string.length': 'Industry ID must be a valid MongoDB ObjectId',
    'any.required': 'Industry is required'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name must not exceed 100 characters',
    'string.empty': 'Company name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  industry: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Industry ID must be a valid MongoDB ObjectId',
    'string.length': 'Industry ID must be a valid MongoDB ObjectId'
  }),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createCompanySchema, updateCompanySchema };

