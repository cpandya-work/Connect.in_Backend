const Joi = require('joi');

const createSportSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Sport name must be at least 2 characters',
    'string.max': 'Sport name must not exceed 100 characters',
    'any.required': 'Sport name is required',
    'string.empty': 'Sport name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateSportSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Sport name must be at least 2 characters',
    'string.max': 'Sport name must not exceed 100 characters',
    'string.empty': 'Sport name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = { createSportSchema, updateSportSchema };
