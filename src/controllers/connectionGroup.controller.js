const asyncHandler = require('../utils/asyncHandler');
const ConnectionGroup = require('../models/ConnectionGroup.model');
const { success } = require('../utils/response');
const mongoose = require('mongoose');

const createGroupCtrl = asyncHandler(async (req, res) => {
  const { name, connections } = req.body;
  const userId = req.user._id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Group name is required' });
  }

  const group = await ConnectionGroup.create({
    userId,
    name: name.trim(),
    connections: Array.isArray(connections) ? connections : [],
  });

  success(res, group, 'Group created successfully');
});

const getGroupsCtrl = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const groups = await ConnectionGroup.find({ userId })
    .populate({
      path: 'connections',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo' },
      select: 'userDetailId'
    })
    .sort({ createdAt: -1 })
    .lean();

  success(res, { groups }, 'Groups retrieved successfully');
});

const getGroupByIdCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ success: false, message: 'Invalid group ID' });
  }

  const group = await ConnectionGroup.findOne({ _id: groupId, userId })
    .populate({
      path: 'connections',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo' },
      select: 'userDetailId'
    })
    .lean();

  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }

  success(res, { group }, 'Group retrieved successfully');
});

const updateGroupCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name, connections } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ success: false, message: 'Invalid group ID' });
  }

  const group = await ConnectionGroup.findOne({ _id: groupId, userId });
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name cannot be empty' });
    }
    group.name = name.trim();
  }

  if (connections !== undefined) {
    group.connections = Array.isArray(connections) ? connections : [];
  }

  await group.save();

  const populatedGroup = await ConnectionGroup.findById(group._id)
    .populate({
      path: 'connections',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo' },
      select: 'userDetailId'
    })
    .lean();

  success(res, populatedGroup, 'Group updated successfully');
});

const deleteGroupCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ success: false, message: 'Invalid group ID' });
  }

  const result = await ConnectionGroup.deleteOne({ _id: groupId, userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }

  success(res, null, 'Group deleted successfully');
});

module.exports = {
  createGroupCtrl,
  getGroupsCtrl,
  getGroupByIdCtrl,
  updateGroupCtrl,
  deleteGroupCtrl,
};
