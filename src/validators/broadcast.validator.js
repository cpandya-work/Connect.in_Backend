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

module.exports = { broadcastNotificationSchema };

