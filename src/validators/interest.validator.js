const Joi = require('joi');

const createInterestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Interest name must be at least 2 characters',
    'string.max': 'Interest name must not exceed 100 characters',
    'any.required': 'Interest name is required',
    'string.empty': 'Interest name cannot be empty'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateInterestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Interest name must be at least 2 characters',
    'string.max': 'Interest name must not exceed 100 characters',
    'string.empty': 'Interest name cannot be empty'
  }),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createInterestSchema, updateInterestSchema };
