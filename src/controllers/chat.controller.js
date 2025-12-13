const asyncHandler = require('../utils/asyncHandler');
const { sendMessage, getChatHistory, getChatList } = require('../services/chat.service');
const { success } = require('../utils/response');
const mongoose = require('mongoose');

const sendMessageCtrl = asyncHandler(async (req, res) => {
  const { receiverId, message } = req.body;

  if (!receiverId || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'receiverId and message are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ success: false, message: 'Invalid receiverId' });
  }

  const chat = await sendMessage(req.user._id, receiverId, message.trim());

  success(res, { chat }, 'Message sent');
});

const getChatHistoryCtrl = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId' });
  }

  const messages = await getChatHistory(req.user._id, userId);

  success(res, { messages }, 'Chat history fetched');
});

const getChatListCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const chats = await getChatList(req.user._id, search);
  success(res, { chats }, 'Chats fetched');
});

module.exports = { sendMessageCtrl, getChatHistoryCtrl, getChatListCtrl };