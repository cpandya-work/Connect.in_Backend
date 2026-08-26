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
  logo_image: Joi.string().trim().optional().allow('').messages({
    'string.base': 'Logo image must be a valid string'
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
  targetAgeMin: Joi.number().integer().min(0).max(120).optional().allow(null, ''),
  targetAgeMax: Joi.number().integer().min(0).max(120).optional().allow(null, ''),
  targetCities: Joi.array().items(Joi.string().trim()).optional().default([]),
  targetPositions: Joi.array().items(Joi.string().trim()).optional().default([]),
  offer_image: Joi.string().trim().optional().allow(null, ''),
  clicks: Joi.number().integer().min(0).optional().default(0),
  views: Joi.number().integer().min(0).optional().default(0),
  isActive: Joi.boolean().optional().default(true),
  showInPopup: Joi.boolean().optional().default(true),
  showInMailer: Joi.boolean().optional().default(true),
  category: Joi.string().trim().hex().length(24).optional().allow(null, ''),
  customHtml: Joi.string().trim().optional().allow(null, ''),
  customSubject: Joi.string().trim().optional().allow(null, '')
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
  logo_image: Joi.string().trim().optional().allow('').messages({
    'string.base': 'Logo image must be a valid string'
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
  targetAgeMin: Joi.number().integer().min(0).max(120).optional().allow(null, ''),
  targetAgeMax: Joi.number().integer().min(0).max(120).optional().allow(null, ''),
  targetCities: Joi.array().items(Joi.string().trim()).optional(),
  targetPositions: Joi.array().items(Joi.string().trim()).optional(),
  offer_image: Joi.string().trim().optional().allow(null, ''),
  clicks: Joi.number().integer().min(0).optional(),
  views: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  showInPopup: Joi.boolean().optional(),
  showInMailer: Joi.boolean().optional(),
  category: Joi.string().trim().hex().length(24).optional().allow(null, ''),
  customHtml: Joi.string().trim().optional().allow(null, ''),
  customSubject: Joi.string().trim().optional().allow(null, '')
}).min(1); // At least one field must be provided

module.exports = { createCardSchema, updateCardSchema };

