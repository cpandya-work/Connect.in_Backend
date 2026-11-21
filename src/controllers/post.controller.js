const asyncHandler = require('../utils/asyncHandler');
const Post = require('../models/Post.model');
const UserConnections = require('../models/UserConnections.model');
const User = require('../models/User.model');
const ConnectionGroup = require('../models/ConnectionGroup.model');
const { sendPostNotification } = require('../services/notification.service');
const { sendQuestionAnsweredEmail, sendAnswerRepliedEmail } = require('../services/email.service');
const { generateAiQuestion, generateAiAnswer, recommendPeopleAndBusinesses } = require('../services/ai.service');
const { success } = require('../utils/response');
const axios = require('axios');

const createPost = asyncHandler(async (req, res) => {
  const { content, connectionGroupId } = req.body;
  const userId = req.user._id;

  const hasAttachments = req.files && req.files.length > 0;
  if (!content && !hasAttachments) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  let linkPreview = null;
  if (content) {
    const urlMatch = content.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
    const url = urlMatch[0];
    try {
      let targetUrl = url.trim();
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 6000
      });

      const html = response.data;
      if (typeof html === 'string') {
        let title = '';
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
        if (ogTitleMatch) {
          title = ogTitleMatch[1];
        } else {
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          if (titleMatch) title = titleMatch[1];
        }

        let description = '';
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
        if (ogDescMatch) {
          description = ogDescMatch[1];
        } else {
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
          if (descMatch) description = descMatch[1];
        }

        let image = '';
        const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
        if (ogImgMatch) {
          image = ogImgMatch[1];
        }

        const decodeHtml = (str) => {
          if (!str) return '';
          return str
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
        };

        linkPreview = {
          title: decodeHtml(title),
          description: decodeHtml(description),
          image: image.trim(),
          url: targetUrl
        };
      }
    } catch (err) {
      console.error('Auto link preview fetching failed:', err.message);
    }
  }
}

  const attachments = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      let type = 'image';
      if (file.mimetype.includes('pdf')) type = 'pdf';
      else if (file.mimetype.includes('doc') || file.mimetype.includes('msword') || file.mimetype.includes('officedocument')) type = 'doc';
      else if (file.mimetype.includes('video') || file.mimetype.includes('mp4')) type = 'video';

      attachments.push({
        url: file.path,
        type: type,
        name: file.originalname
      });
    });
  }

  // Fetch poster details for targetSegments authorCity and notifications
  const poster = await User.findById(userId).populate('userDetailId');
  const posterName = poster?.userDetailId?.fullName || 'A user';
  const posterImage = poster?.userDetailId?.profileImage || '';
  const authorCity = poster?.userDetailId?.city || null;

  let postType = req.body.postType || 'ask';

  let targetSegments = {
    postType: 'ask',
    connections: connectionGroupId ? false : true,
    city: false,
    industries: [],
    interests: [],
    ageGroups: []
  };

  if (req.body.targetSegments) {
    try {
      const parsed = typeof req.body.targetSegments === 'string'
        ? JSON.parse(req.body.targetSegments)
        : req.body.targetSegments;
      if (parsed.postType) {
        postType = parsed.postType;
      }
      targetSegments = {
        postType,
        getAiResponses: typeof parsed.getAiResponses === 'boolean' ? parsed.getAiResponses : true,
        audienceType: parsed.audienceType || 'help',
        connections: connectionGroupId ? false : (typeof parsed.connections === 'boolean' ? parsed.connections : true),
        city: typeof parsed.city === 'boolean' ? parsed.city : false,
        industries: Array.isArray(parsed.industries) ? parsed.industries : [],
        interests: Array.isArray(parsed.interests) ? parsed.interests : [],
        ageGroups: Array.isArray(parsed.ageGroups) ? parsed.ageGroups : []
      };
    } catch (e) {
      console.error('Error parsing targetSegments:', e);
    }
  }

  const isAskedOnlyToConnections = Boolean(
    connectionGroupId ||
    targetSegments.audienceType === 'connections' ||
    (
      !targetSegments.audienceType &&
      targetSegments.connections === true &&
      targetSegments.city === false &&
      (!targetSegments.industries || targetSegments.industries.length === 0) &&
      (!targetSegments.interests || targetSegments.interests.length === 0) &&
      (!targetSegments.ageGroups || targetSegments.ageGroups.length === 0)
    )
  );
  const isPeopleWhoCanHelp = targetSegments.audienceType === 'help';
  const isApproved = isAskedOnlyToConnections || isPeopleWhoCanHelp;

  // Automatically populate question with AI for every ask or share submission
  let aiQuestion = (req.body.question || req.body.title || '').trim();
  if (content && content.trim()) {
    try {
      const generatedQ = await generateAiQuestion(content.trim(), postType, targetSegments);
      if (generatedQ) {
        aiQuestion = generatedQ;
      }
    } catch (qErr) {
      console.error('Error generating AI question during post creation:', qErr);
      if (!aiQuestion) {
        const firstLine = content.trim().split('\n')[0].trim().slice(0, 100);
        aiQuestion = firstLine.endsWith('?') ? firstLine : `${firstLine}?`;
      }
    }
  }

  // Generate AI Answer and Profile Recommendations
  let aiAnswer = null;
  let aiRecommendations = { people: [], businesses: [] };

  const shouldGenerateAiAnswer = targetSegments.getAiResponses !== false;

  if (content && content.trim()) {
    try {
      if (shouldGenerateAiAnswer) {
        aiAnswer = await generateAiAnswer(aiQuestion || content.trim(), targetSegments);
      }
      aiRecommendations = await recommendPeopleAndBusinesses(aiQuestion ? `${aiQuestion} ${content.trim()}` : content.trim(), targetSegments, userId);
    } catch (aiErr) {
      console.error('Error generating AI data during post creation:', aiErr);
    }
  }

  const post = await Post.create({
    userId,
    postType,
    question: aiQuestion,
    title: aiQuestion,
    content: content || '',
    attachments,
    linkPreview,
    targetSegments,
    authorCity,
    connectionGroupId: connectionGroupId || null,
    isApproved,
    aiAnswer,
    aiRecommendations
  });

  if (isApproved) {
    setImmediate(async () => {
      try {
        const allUsers = await User.find({ _id: { $ne: userId } }).populate('userDetailId');
        const connections = await UserConnections.find({
          $or: [
            { connection1Id: userId },
            { connection2Id: userId },
          ],
        });

        const connectionIds = new Set(
          connections.map(c =>
            c.connection1Id.toString() === userId.toString() ? c.connection2Id.toString() : c.connection1Id.toString()
          )
        );

        const posterName = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessName : (poster?.userDetailId?.fullName || 'A user');
        const posterImage = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessLogo : (poster?.userDetailId?.profileImage || '');

        let targetUserIdsToNotify = [];
        if (isPeopleWhoCanHelp) {
          // If 'People who can help', notify prospects (up to 500)
          const prospectIds = (aiRecommendations.people || []).map(p => p.user?.toString ? p.user.toString() : String(p.user));
          targetUserIdsToNotify = prospectIds.slice(0, 500);
          if (targetUserIdsToNotify.length === 0) {
            targetUserIdsToNotify = Array.from(connectionIds);
          }
        } else {
          targetUserIdsToNotify = Array.from(connectionIds);
        }

        const notifyPromises = targetUserIdsToNotify.map(async (targetUserId) => {
          sendPostNotification(targetUserId, posterName, userId, posterImage).catch(console.error);
        });

        await Promise.all(notifyPromises);
      } catch (err) {
        console.error('Error sending auto-approved post notifications:', err);
      }
    });
  }

  const populatedPost = await Post.findById(post._id).populate({
    path: 'userId',
    populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
    select: 'userDetailId'
  }).populate('connectionGroupId', 'name');

  success(res, populatedPost, isApproved ? 'Post created and published successfully' : 'Post created successfully and pending admin approval');
});

function getAgeGroup(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age >= 20 && age <= 25) return '20-25';
  if (age >= 26 && age <= 35) return '26-35';
  if (age >= 36 && age <= 50) return '36-50';
  if (age >= 51 && age <= 65) return '51-65';
  if (age > 65) return '65+';
  return null;
}

const getPosts = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const { sortBy, filter, page: queryPage, limit: queryLimit } = req.query;

  const page = Math.max(1, parseInt(queryPage, 10) || 1);
  const limit = Math.max(1, parseInt(queryLimit, 10) || 10);
  const skip = (page - 1) * limit;

  let queryFilter;

  if (!userId) {
    // Unauthenticated public visitors see all public approved questions
    queryFilter = {
      $and: [
        { connectionGroupId: null },
        {
          $or: [
            { isApproved: true },
            { isApproved: { $ne: false } }
          ]
        }
      ]
    };
    if (filter === 'unanswered') {
      queryFilter.$and.push({
        $or: [
          { commentsCount: 0 },
          { commentsCount: { $exists: false } },
          { comments: { $size: 0 } }
        ]
      });
    } else if (filter === 'asked') {
      queryFilter.$and.push({
        postType: { $ne: 'share' },
        'targetSegments.postType': { $ne: 'share' }
      });
    }
  } else {
    // Authenticated user personalization logic
    const user = await User.findById(userId).populate('userDetailId');
    const userDetail = user?.userDetailId;
    const userIndustry = userDetail?.industry || '';
    const userInterests = userDetail?.interests || [];
    const userCityId = userDetail?.city ? userDetail.city.toString() : null;
    const userAgeGroup = userDetail?.dateOfBirth ? getAgeGroup(userDetail.dateOfBirth) : null;

    // Find connections
    const connections = await UserConnections.find({
      $or: [
        { connection1Id: userId },
        { connection2Id: userId },
      ],
    });

    const connectionIds = connections.map(c =>
      c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
    );

    // Fetch connection groups where current user is a member
    const myGroups = await ConnectionGroup.find({ connections: userId }).select('_id');
    const myGroupIds = myGroups.map(g => g._id);

    const orQueries = [
      // 1. User sees their own posts
      { userId: userId },

      // 2. User sees posts shared with a group they are in
      { connectionGroupId: { $in: myGroupIds } },

      // 3. User sees posts of connections targeted at connections or having no targetSegments
      {
        userId: { $in: connectionIds },
        connectionGroupId: null,
        $or: [
          { targetSegments: { $exists: false } },
          { 'targetSegments.connections': true },
          {
            'targetSegments.connections': false,
            'targetSegments.city': false,
            'targetSegments.industries': { $size: 0 },
            'targetSegments.interests': { $size: 0 },
            'targetSegments.ageGroups': { $size: 0 }
          }
        ]
      },

      // 4. Public questions on Share/Ask page (not restricted to a connection group)
      {
        connectionGroupId: null
      }
    ];

    // 4. User sees posts targeted at their industry (even if not connected)
    if (userIndustry) {
      orQueries.push({
        connectionGroupId: null,
        'targetSegments.industries': userIndustry
      });
    }

    // 4b. User sees posts targeted at their interests (even if not connected)
    if (userInterests && userInterests.length > 0) {
      orQueries.push({
        connectionGroupId: null,
        'targetSegments.interests': { $in: userInterests }
      });
    }

    // 5. User sees posts targeted at their city (even if not connected)
    const userCityIdStr = userCityId || (userDetail?.city?._id ? userDetail.city._id.toString() : (userDetail?.city ? userDetail.city.toString() : null));
    if (userCityIdStr) {
      orQueries.push({
        connectionGroupId: null,
        'targetSegments.city': true,
        $or: [
          { authorCity: userCityIdStr },
          { authorCity: null },
          { authorCity: { $exists: false } }
        ]
      });
    } else {
      // If viewing user city is not explicitly set, include city-targeted questions so they are discoverable
      orQueries.push({
        connectionGroupId: null,
        'targetSegments.city': true
      });
    }

    // 6. User sees posts targeted at their age group (even if not connected)
    if (userAgeGroup) {
      orQueries.push({
        connectionGroupId: null,
        'targetSegments.ageGroups': userAgeGroup
      });
    }

    queryFilter = {
      $and: [
        { $or: orQueries },
        {
          $or: [
            { isApproved: true },
            { isApproved: { $ne: false } },
            { userId: userId }
          ]
        }
      ]
    };

    if (filter === 'my') {
      queryFilter.$and.push({ userId: userId });
    } else if (filter === 'connections') {
      queryFilter.$and.push({ userId: { $in: [...connectionIds, userId] } });
    } else if (filter === 'shared') {
      queryFilter.$and.push({ userId: { $ne: userId } });
    } else if (filter === 'asked') {
      queryFilter.$and.push({
        postType: { $ne: 'share' },
        'targetSegments.postType': { $ne: 'share' }
      });
    } else if (filter === 'unanswered') {
      queryFilter.$and.push({
        $or: [
          { commentsCount: 0 },
          { commentsCount: { $exists: false } },
          { comments: { $size: 0 } }
        ]
      });
    }
  }

  const totalPosts = await Post.countDocuments(queryFilter);

  let posts;
  if (sortBy === 'popularity') {
    posts = await Post.find(queryFilter)
      .populate({
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
        select: 'userDetailId'
      })
      .populate({
        path: 'reactions.userId',
        populate: { path: 'userDetailId', select: 'fullName isBusinessProfile businessName' },
        select: 'userDetailId'
      })
      .populate('connectionGroupId', 'name')
      .populate({
        path: 'sharedPostId',
        populate: {
          path: 'userId',
          populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
          select: 'userDetailId'
        }
      })
      .populate({
        path: 'comments.userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
        select: 'userDetailId'
      })
      .populate({
        path: 'comments.replies.userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
        select: 'userDetailId'
      })
      .lean();

    posts.sort((a, b) => {
      const aCount = a.reactions ? a.reactions.length : 0;
      const bCount = b.reactions ? b.reactions.length : 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    posts = posts.slice(skip, skip + limit);
  } else {
    posts = await Post.find(queryFilter)
      .populate({
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
        select: 'userDetailId'
      })
      .populate({
        path: 'reactions.userId',
        populate: { path: 'userDetailId', select: 'fullName isBusinessProfile businessName' },
        select: 'userDetailId'
      })
      .populate('connectionGroupId', 'name')
      .populate({
        path: 'sharedPostId',
        populate: {
          path: 'userId',
          populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
          select: 'userDetailId'
        }
      })
      .populate({
        path: 'comments.userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
        select: 'userDetailId'
      })
      .populate({
        path: 'comments.replies.userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
        select: 'userDetailId'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  const totalPages = Math.ceil(totalPosts / limit);
  const hasMore = page < totalPages;

  return res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      totalPosts,
      totalPages,
      currentPage: page,
      limit,
      hasMore
    },
    message: 'Posts retrieved successfully'
  });
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const mongoose = require('mongoose');

  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ success: false, message: 'Invalid question ID' });
  }

  const post = await Post.findById(postId)
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
      select: 'userDetailId'
    })
    .populate({
      path: 'reactions.userId',
      populate: { path: 'userDetailId', select: 'fullName isBusinessProfile businessName' },
      select: 'userDetailId'
    })
    .populate('connectionGroupId', 'name')
    .populate({
      path: 'sharedPostId',
      populate: {
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
        select: 'userDetailId'
      }
    })
    .populate({
      path: 'comments.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId'
    })
    .populate({
      path: 'comments.replies.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId'
    })
    .lean();

  if (!post) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }

  // If question is pending approval, allow only the author or an admin
  if (post.isApproved === false) {
    const userId = req.user ? String(req.user._id) : null;
    const authorId = post.userId?._id ? String(post.userId._id) : String(post.userId);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!userId || (userId !== authorId && !isAdmin)) {
      return res.status(403).json({ success: false, message: 'This question is pending approval and is only visible to the author' });
    }
  }

  // If question is restricted to a private connection group, check membership if user is present
  if (post.connectionGroupId) {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(403).json({ success: false, message: 'This question is private to a group. Please log in.' });
    }
    const isMember = await ConnectionGroup.findOne({ _id: post.connectionGroupId._id, connections: userId });
    if (!isMember && String(post.userId?._id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this group question' });
    }
  }

  return success(res, post, 'Question retrieved successfully');
});

const reactToPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { reaction } = req.body;
  const userId = req.user._id;

  const validReactions = ['👍', '❤️', '😃', '🙏', '👏', '👌', '😮', '😢'];
  if (!reaction || !validReactions.includes(reaction)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing reaction' });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  if (!post.reactions) {
    post.reactions = [];
  }

  // Find user's existing reaction
  const existingReactionIndex = post.reactions.findIndex(
    (r) => r.userId.toString() === userId.toString()
  );

  if (existingReactionIndex > -1) {
    if (post.reactions[existingReactionIndex].reaction === reaction) {
      // Toggle off: remove the reaction
      post.reactions.splice(existingReactionIndex, 1);
    } else {
      // Update reaction: change the emoji
      post.reactions[existingReactionIndex].reaction = reaction;
    }
  } else {
    // Add new reaction
    post.reactions.push({ userId, reaction });
  }

  await post.save();

  // Only send notification if the reactor is not the owner of the post
  if (post.userId.toString() !== userId.toString()) {
    const currentReactionObj = post.reactions.find(
      (r) => r.userId.toString() === userId.toString()
    );
    if (currentReactionObj) {
      // Send notification in the background (non-blocking)
      setImmediate(async () => {
        try {
          const reactor = await User.findById(userId).populate('userDetailId');
          const reactorName = reactor?.userDetailId?.fullName || 'Someone';
          const reactorImage = reactor?.userDetailId?.profileImage || '';
          
          const { sendPostReactionNotification } = require('../services/notification.service');
          await sendPostReactionNotification(
            post.userId,
            reactorName,
            userId,
            reactorImage,
            currentReactionObj.reaction
          );
        } catch (err) {
          console.error('Error sending post reaction notification:', err);
        }
      });
    }
  }

  // Populate reactions before returning
  const populatedPost = await Post.findById(postId).populate({
    path: 'reactions.userId',
    populate: { path: 'userDetailId', select: 'fullName isBusinessProfile businessName' },
    select: 'userDetailId'
  });

  success(res, populatedPost.reactions, 'Reaction updated successfully');
});

const incrementPostView = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }
  success(res, { views: post.views }, 'Post view incremented');
});

const getLinkPreview = asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'URL query parameter is required' });
  }

  try {
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 6000
    });

    const html = response.data;
    if (typeof html !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid page content returned' });
    }

    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) title = titleMatch[1];
    }

    let description = '';
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      description = ogDescMatch[1];
    } else {
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      if (descMatch) description = descMatch[1];
    }

    let image = '';
    const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    if (ogImgMatch) {
      image = ogImgMatch[1];
    }

    const decodeHtml = (str) => {
      if (!str) return '';
      return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    };

    return success(res, {
      title: decodeHtml(title),
      description: decodeHtml(description),
      image: image.trim(),
      url: targetUrl
    });
  } catch (err) {
    console.error('Link preview generation failed for URL:', url, err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch link preview: ' + err.message 
    });
  }
});

const resharePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const originalPost = await Post.findById(postId);
  if (!originalPost) {
    return res.status(404).json({ success: false, message: 'Original post not found' });
  }

  // Fetch poster details for targetSegments authorCity
  const poster = await User.findById(userId).populate('userDetailId');
  const authorCity = poster?.userDetailId?.city || null;

  // Generate question for the reshared post (or inherit from original post)
  let aiQuestion = (req.body.question || req.body.title || '').trim();
  if (!aiQuestion && content && content.trim()) {
    try {
      const generatedQ = await generateAiQuestion(content.trim(), 'share', { postType: 'share' });
      if (generatedQ) {
        aiQuestion = generatedQ;
      }
    } catch (qErr) {
      console.error('Error generating AI question during reshare:', qErr);
    }
  }

  if (!aiQuestion) {
    aiQuestion = (originalPost.question || originalPost.title || '').trim();
  }

  if (!aiQuestion && originalPost.content && originalPost.content.trim()) {
    try {
      const generatedQ = await generateAiQuestion(originalPost.content.trim(), 'share', { postType: 'share' });
      if (generatedQ) {
        aiQuestion = generatedQ;
      }
    } catch (qErr) {
      console.error('Error generating AI question from original post during reshare:', qErr);
    }
  }

  if (!aiQuestion) {
    aiQuestion = 'What are your thoughts on this shared post?';
  }

  // Create the reshared post
  const rootPostId = originalPost.sharedPostId || originalPost._id;
  const reshare = await Post.create({
    userId,
    postType: 'share',
    question: aiQuestion,
    title: aiQuestion,
    content: content || '',
    sharedPostId: rootPostId, // Reference the root post if original is already a reshare
    targetSegments: {
      postType: 'share',
      connections: true,
      city: false,
      industries: [],
      ageGroups: []
    },
    authorCity,
    isApproved: true
  });

  setImmediate(async () => {
    try {
      const allUsers = await User.find({ _id: { $ne: userId } }).populate('userDetailId');
      const connections = await UserConnections.find({
        $or: [
          { connection1Id: userId },
          { connection2Id: userId },
        ],
      });

      const connectionIds = new Set(
        connections.map(c =>
          c.connection1Id.toString() === userId.toString() ? c.connection2Id.toString() : c.connection1Id.toString()
        )
      );

      const posterName = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessName : (poster?.userDetailId?.fullName || 'A user');
      const posterImage = poster?.userDetailId?.isBusinessProfile ? poster.userDetailId.businessLogo : (poster?.userDetailId?.profileImage || '');

      const notifyPromises = allUsers.map(async (user) => {
        const isConnection = connectionIds.has(user._id.toString());
        if (isConnection) {
          sendPostNotification(user._id, posterName, userId, posterImage).catch(console.error);
        }
      });

      await Promise.all(notifyPromises);
    } catch (err) {
      console.error('Error sending reshared post notifications:', err);
    }
  });

  await Post.findByIdAndUpdate(rootPostId, { $inc: { reshareCount: 1 } });

  const populatedPost = await Post.findById(reshare._id)
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
      select: 'userDetailId'
    })
    .populate({
      path: 'sharedPostId',
      populate: {
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
        select: 'userDetailId'
      }
    })
    .populate('connectionGroupId', 'name');

  success(res, populatedPost, 'Post reshared successfully');
});

const getTopSharers = asyncHandler(async (req, res) => {
  // Aggregate to find users with most posts
  const topSharers = await Post.aggregate([
    { $match: { isApproved: true } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Populate user details
  const populatedSharers = await Promise.all(
    topSharers.map(async (item) => {
      if (!item._id) return null;
      const user = await User.findById(item._id)
        .populate('userDetailId', 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus')
        .lean();
      if (!user) return null;
      return {
        user: {
          _id: user._id,
          userDetailId: user.userDetailId
        },
        sharesCount: item.count
      };
    })
  );

  const result = populatedSharers.filter(item => item !== null);

  // Sort final list by sharesCount desc
  result.sort((a, b) => b.sharesCount - a.sharesCount);

  success(res, result);
});

const getMostSharedReels = asyncHandler(async (req, res) => {
  // Query posts that have video attachments
  let reels = await Post.find({
    isApproved: true,
    'attachments.type': 'video'
  })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
      select: 'userDetailId'
    })
    .lean();

  // If we don't have enough reels, fallback to other real posts in the database
  if (reels.length < 5) {
    const fallbackPosts = await Post.find({
      isApproved: true,
      _id: { $nin: reels.map(r => r._id) }
    })
      .populate({
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
        select: 'userDetailId'
      })
      .limit(5 - reels.length)
      .lean();
    reels = [...reels, ...fallbackPosts];
  }

  // Map and calculate score = reactions.length + reshareCount
  const reelsWithScore = reels.map(post => {
    const likesCount = post.reactions ? post.reactions.length : 0;
    const reshares = post.reshareCount || 0;
    const score = likesCount + reshares;
    return {
      ...post,
      likesCount,
      reshares,
      score
    };
  });

  // Sort by score desc, then limit 5
  reelsWithScore.sort((a, b) => b.score - a.score);
  const result = reelsWithScore.slice(0, 5);

  success(res, result);
});

/**
 * Let a user edit their own post while it's still pending admin approval.
 * Once approved, it can no longer be edited here.
 */
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content, question, title } = req.body;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }

  if (post.userId.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: 'You can only edit your own questions' });
  }

  if (post.isApproved) {
    return res.status(400).json({ success: false, message: 'This question has already been approved and can no longer be edited' });
  }

  const hasNewAttachments = req.files && req.files.length > 0;
  const nextContent = content !== undefined ? content : post.content;
  const nextQuestion = question !== undefined ? question : (title !== undefined ? title : post.question);
  const nextAttachmentsCount = hasNewAttachments ? req.files.length : (post.attachments ? post.attachments.length : 0);

  if (!nextContent?.trim() && !nextQuestion?.trim() && nextAttachmentsCount === 0) {
    return res.status(400).json({ success: false, message: 'Question text or description is required' });
  }

  if (content !== undefined) {
    post.content = content;
  }

  if (question !== undefined || title !== undefined) {
    post.question = nextQuestion ? nextQuestion.trim() : '';
    post.title = nextQuestion ? nextQuestion.trim() : '';
  }

  // Replace attachments only if new files were uploaded
  if (hasNewAttachments) {
    post.attachments = req.files.map(file => {
      let type = 'image';
      if (file.mimetype.includes('pdf')) type = 'pdf';
      else if (file.mimetype.includes('doc') || file.mimetype.includes('msword') || file.mimetype.includes('officedocument')) type = 'doc';
      else if (file.mimetype.includes('video') || file.mimetype.includes('mp4')) type = 'video';
      return { url: file.path, type, name: file.originalname };
    });
  }

  if (post.targetSegments?.getAiResponses !== false) {
    try {
      const promptText = post.question || post.content;
      if (promptText && promptText.trim()) {
        post.aiAnswer = await generateAiAnswer(promptText.trim(), post.targetSegments);
      }
    } catch (aiErr) {
      console.error('Error updating AI data during question update:', aiErr);
    }
  }

  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessApprovalStatus' },
      select: 'userDetailId'
    })
    .populate('connectionGroupId', 'name');

  success(res, { post: updatedPost }, 'Question updated successfully');
});

/**
 * Let a user delete their own post while it's still pending admin approval.
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  if (post.userId.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: 'You can only delete your own posts' });
  }

  if (post.isApproved) {
    return res.status(400).json({ success: false, message: 'This post has already been approved and can no longer be deleted here' });
  }

  await Post.findByIdAndDelete(postId);

  success(res, null, 'Post deleted successfully');
});

const addPostComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Comment text is required' });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  if (!post.comments) post.comments = [];

  post.comments.push({
    userId,
    text: text.trim(),
    createdAt: new Date()
  });

  post.commentsCount = post.comments.length;
  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate({
      path: 'comments.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    })
    .populate({
      path: 'comments.replies.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    });

  setImmediate(async () => {
    try {
      const postWithAuthor = await Post.findById(postId).populate({
        path: 'userId',
        populate: { path: 'userDetailId', select: 'fullName email isBusinessProfile businessName' }
      });

      if (postWithAuthor && postWithAuthor.userId) {
        const questionAuthorId = postWithAuthor.userId._id ? postWithAuthor.userId._id.toString() : postWithAuthor.userId.toString();
        const commenterId = userId.toString();

        if (questionAuthorId !== commenterId) {
          const authorEmail = postWithAuthor.userId.userDetailId?.email || postWithAuthor.userId.email;
          const authorName = postWithAuthor.userId.userDetailId?.isBusinessProfile
            ? postWithAuthor.userId.userDetailId.businessName
            : (postWithAuthor.userId.userDetailId?.fullName || 'User');

          const commenterUser = await User.findById(userId).populate('userDetailId');
          const commenterName = commenterUser?.userDetailId?.isBusinessProfile
            ? commenterUser.userDetailId.businessName
            : (commenterUser?.userDetailId?.fullName || 'A member');

          console.log(`[AddComment Email Trigger] Question Author Email: "${authorEmail}", Author Name: "${authorName}", Commenter: "${commenterName}"`);

          if (authorEmail) {
            sendQuestionAnsweredEmail(
              authorEmail,
              authorName,
              commenterName,
              postWithAuthor.content,
              text.trim()
            ).catch(err => console.error('[AddComment Email Error] Failed:', err));
          } else {
            console.log(`[AddComment Email Skipped] Question author (${authorName}) does not have a valid email.`);
          }
        } else {
          console.log(`[AddComment Email Skipped] Author commented on their own question.`);
        }
      }
    } catch (err) {
      console.error('[AddComment Email Error] Unexpected error:', err);
    }
  });

  return success(res, updatedPost.comments, 'Comment added successfully');
});

const likePostComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const comment = post.comments.id(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  if (!Array.isArray(comment.likes)) comment.likes = [];

  const userIdStr = userId.toString();
  const index = comment.likes.findIndex(id => id.toString() === userIdStr);
  if (index > -1) {
    comment.likes.splice(index, 1);
  } else {
    comment.likes.push(userId);
  }

  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate({
      path: 'comments.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    })
    .populate({
      path: 'comments.replies.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    });

  return success(res, updatedPost.comments, 'Comment like updated successfully');
});

const replyPostComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required' });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const comment = post.comments.id(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  if (!Array.isArray(comment.replies)) comment.replies = [];

  comment.replies.push({
    userId,
    text: text.trim(),
    createdAt: new Date()
  });

  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate({
      path: 'comments.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    })
    .populate({
      path: 'comments.replies.userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo position company industry' },
      select: 'userDetailId email username'
    });

  setImmediate(async () => {
    try {
      const postWithComment = await Post.findById(postId).populate({
        path: 'comments.userId',
        populate: { path: 'userDetailId', select: 'fullName email isBusinessProfile businessName' }
      });

      if (postWithComment) {
        const targetComment = postWithComment.comments.id(commentId);
        if (targetComment && targetComment.userId) {
          const commentAuthorId = targetComment.userId._id ? targetComment.userId._id.toString() : targetComment.userId.toString();
          const replierId = userId.toString();

          if (commentAuthorId !== replierId) {
            const authorEmail = targetComment.userId.userDetailId?.email || targetComment.userId.email;
            const authorName = targetComment.userId.userDetailId?.isBusinessProfile
              ? targetComment.userId.userDetailId.businessName
              : (targetComment.userId.userDetailId?.fullName || 'User');

            const replierUser = await User.findById(userId).populate('userDetailId');
            const replierName = replierUser?.userDetailId?.isBusinessProfile
              ? replierUser.userDetailId.businessName
              : (replierUser?.userDetailId?.fullName || 'A member');

            console.log(`[ReplyComment Email Trigger] Answer Author Email: "${authorEmail}", Author Name: "${authorName}", Replier: "${replierName}"`);

            if (authorEmail) {
              sendAnswerRepliedEmail(
                authorEmail,
                authorName,
                replierName,
                text.trim()
              ).catch(err => console.error('[ReplyComment Email Error] Failed:', err));
            } else {
              console.log(`[ReplyComment Email Skipped] Answer author (${authorName}) does not have a valid email.`);
            }
          } else {
            console.log(`[ReplyComment Email Skipped] Author replied to their own answer.`);
          }
        }
      }
    } catch (err) {
      console.error('[ReplyComment Email Error] Unexpected error:', err);
    }
  });

  return success(res, updatedPost.comments, 'Reply added successfully');
});

const rateAiAnswer = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { feedback } = req.body;
  const userId = req.user._id;

  if (!['up', 'down'].includes(feedback)) {
    return res.status(400).json({ success: false, message: 'Invalid feedback. Must be up or down' });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  if (!post.aiAnswer) {
    post.aiAnswer = { content: '', sources: [], helpfulUp: [], helpfulDown: [] };
  }

  if (!Array.isArray(post.aiAnswer.helpfulUp)) post.aiAnswer.helpfulUp = [];
  if (!Array.isArray(post.aiAnswer.helpfulDown)) post.aiAnswer.helpfulDown = [];

  const userIdStr = userId.toString();
  const upIndex = post.aiAnswer.helpfulUp.findIndex(id => id.toString() === userIdStr);
  const downIndex = post.aiAnswer.helpfulDown.findIndex(id => id.toString() === userIdStr);

  if (feedback === 'up') {
    if (upIndex > -1) {
      post.aiAnswer.helpfulUp.splice(upIndex, 1);
    } else {
      post.aiAnswer.helpfulUp.push(userId);
      if (downIndex > -1) post.aiAnswer.helpfulDown.splice(downIndex, 1);
    }
  } else if (feedback === 'down') {
    if (downIndex > -1) {
      post.aiAnswer.helpfulDown.splice(downIndex, 1);
    } else {
      post.aiAnswer.helpfulDown.push(userId);
      if (upIndex > -1) post.aiAnswer.helpfulUp.splice(upIndex, 1);
    }
  }

  await post.save();

  return success(res, {
    helpfulUp: post.aiAnswer.helpfulUp,
    helpfulDown: post.aiAnswer.helpfulDown
  }, 'Feedback recorded successfully');
});

module.exports = {
  createPost,
  getPosts,
  getPostById,
  reactToPost,
  incrementPostView,
  getLinkPreview,
  resharePost,
  getTopSharers,
  getMostSharedReels,
  updatePost,
  deletePost,
  addPostComment,
  likePostComment,
  replyPostComment,
  rateAiAnswer,
};
