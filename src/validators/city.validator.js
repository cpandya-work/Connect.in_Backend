const Joi = require('joi');

const createCitySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'City name must be at least 2 characters',
    'string.max': 'City name must not exceed 100 characters',
    'any.required': 'City name is required',
    'string.empty': 'City name cannot be empty'
  }),
  isMetro: Joi.boolean().optional().default(false),
  isActive: Joi.boolean().optional().default(true)
});

const updateCitySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'City name must be at least 2 characters',
    'string.max': 'City name must not exceed 100 characters',
    'string.empty': 'City name cannot be empty'
  }),
  isMetro: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createCitySchema, updateCitySchema };
