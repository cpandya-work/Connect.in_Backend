const Joi = require('joi');

const createPositionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Position name must be at least 2 characters',
    'string.max': 'Position name must not exceed 100 characters',
    'any.required': 'Position name is required',
    'string.empty': 'Position name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updatePositionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Position name must be at least 2 characters',
    'string.max': 'Position name must not exceed 100 characters',
    'string.empty': 'Position name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = { createPositionSchema, updatePositionSchema };
