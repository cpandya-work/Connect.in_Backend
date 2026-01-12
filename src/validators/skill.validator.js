const Joi = require('joi');

const createSkillSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Skill name must be at least 2 characters',
    'string.max': 'Skill name must not exceed 100 characters',
    'any.required': 'Skill name is required',
    'string.empty': 'Skill name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateSkillSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Skill name must be at least 2 characters',
    'string.max': 'Skill name must not exceed 100 characters',
    'string.empty': 'Skill name cannot be empty'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters'
  }),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createSkillSchema, updateSkillSchema };
