const Joi = require('joi');

const broadcastNotificationSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Title must be at least 2 characters',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
    'string.empty': 'Title cannot be empty'
  }),
  description: Joi.string().trim().min(5).max(500).required().messages({
    'string.min': 'Description must be at least 5 characters',
    'string.max': 'Description must not exceed 500 characters',
    'any.required': 'Description is required',
    'string.empty': 'Description cannot be empty'
  })
});

const generalSmsBroadcastSchema = Joi.object({
  days: Joi.string().valid('7', '15', '30', '45', 'all').required(),
  message: Joi.string().trim().min(5).max(500).allow('').optional().messages({
    'string.min': 'Message must be at least 5 characters',
    'string.max': 'Message must not exceed 500 characters',
  }),
  templateId: Joi.string().trim().allow('').optional()
}).or('message', 'templateId');

const targetedEmailBroadcastSchema = Joi.object({
  days: Joi.string().valid('7', '15', '30', '45', 'all').required(),
  subject: Joi.string().trim().min(2).max(150).required().messages({
    'string.min': 'Subject must be at least 2 characters',
    'string.max': 'Subject must not exceed 150 characters',
    'any.required': 'Subject is required',
    'string.empty': 'Subject cannot be empty'
  }),
  htmlContent: Joi.string().trim().min(5).required().messages({
    'string.min': 'HTML Content must be at least 5 characters',
    'any.required': 'HTML Content is required',
    'string.empty': 'HTML Content cannot be empty'
  })
});

module.exports = { 
  broadcastNotificationSchema,
  generalSmsBroadcastSchema,
  targetedEmailBroadcastSchema
};

