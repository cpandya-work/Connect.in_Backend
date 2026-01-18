const Joi = require('joi');

const createCardSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Card name must be at least 2 characters',
    'string.max': 'Card name must not exceed 100 characters',
    'any.required': 'Card name is required',
    'string.empty': 'Card name cannot be empty'
  }),
  description: Joi.string().trim().max(1000).optional().allow('').messages({
    'string.max': 'Description must not exceed 1000 characters'
  }),
  logo_image: Joi.string().uri().trim().optional().allow('').messages({
    'string.uri': 'Logo image must be a valid URL'
  }),
  // Note: logo_image will be set automatically from file upload, validation happens in controller
  url: Joi.string().uri().trim().required().messages({
    'string.uri': 'URL must be a valid URL',
    'any.required': 'URL is required',
    'string.empty': 'URL cannot be empty'
  }),
  features: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).optional().default([]).messages({
    'array.base': 'Features must be an array',
    'string.min': 'Each feature must be at least 1 character',
    'string.max': 'Each feature must not exceed 200 characters'
  }),
  eligibles: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).optional().default([]).messages({
    'array.base': 'Eligibles must be an array',
    'string.min': 'Each eligible must be at least 1 character',
    'string.max': 'Each eligible must not exceed 200 characters'
  }),
  isActive: Joi.boolean().optional().default(true)
});

const updateCardSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Card name must be at least 2 characters',
    'string.max': 'Card name must not exceed 100 characters',
    'string.empty': 'Card name cannot be empty'
  }),
  description: Joi.string().trim().max(1000).optional().allow('').messages({
    'string.max': 'Description must not exceed 1000 characters'
  }),
  logo_image: Joi.string().uri().trim().optional().allow('').messages({
    'string.uri': 'Logo image must be a valid URL'
  }),
  // Note: logo_image will be set automatically from file upload, validation happens in controller
  url: Joi.string().uri().trim().optional().messages({
    'string.uri': 'URL must be a valid URL',
    'string.empty': 'URL cannot be empty'
  }),
  features: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).optional().messages({
    'array.base': 'Features must be an array',
    'string.min': 'Each feature must be at least 1 character',
    'string.max': 'Each feature must not exceed 200 characters'
  }),
  eligibles: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).optional().messages({
    'array.base': 'Eligibles must be an array',
    'string.min': 'Each eligible must be at least 1 character',
    'string.max': 'Each eligible must not exceed 200 characters'
  }),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided

module.exports = { createCardSchema, updateCardSchema };

