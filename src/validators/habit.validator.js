const Joi = require('joi');

const createHabitSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Habit name must be at least 2 characters',
    'string.max': 'Habit name must not exceed 100 characters',
    'any.required': 'Habit name is required',
    'string.empty': 'Habit name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateHabitSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Habit name must be at least 2 characters',
    'string.max': 'Habit name must not exceed 100 characters',
    'string.empty': 'Habit name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createHabitSchema, updateHabitSchema };

