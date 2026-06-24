const asyncHandler = require('../utils/asyncHandler');
const Post = require('../models/Post.model');
const UserConnections = require('../models/UserConnections.model');
const User = require('../models/User.model');
const { sendPostNotification } = require('../services/notification.service');
const { sendNewPostEmail } = require('../services/email.service');
const { success } = require('../utils/response');
const axios = require('axios');

const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  let linkPreview = null;
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

  const attachments = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      let type = 'image';
      if (file.mimetype.includes('pdf')) type = 'pdf';
      else if (file.mimetype.includes('doc') || file.mimetype.includes('msword') || file.mimetype.includes('officedocument')) type = 'doc';

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

  let targetSegments = {
    connections: true,
    city: false,
    industries: [],
    ageGroups: []
  };

  if (req.body.targetSegments) {
    try {
      const parsed = typeof req.body.targetSegments === 'string'
        ? JSON.parse(req.body.targetSegments)
        : req.body.targetSegments;
      targetSegments = {
        connections: typeof parsed.connections === 'boolean' ? parsed.connections : true,
        city: typeof parsed.city === 'boolean' ? parsed.city : false,
        industries: Array.isArray(parsed.industries) ? parsed.industries : [],
        ageGroups: Array.isArray(parsed.ageGroups) ? parsed.ageGroups : []
      };
    } catch (e) {
      console.error('Error parsing targetSegments:', e);
    }
  }

  const post = await Post.create({
    userId,
    content,
    attachments,
    linkPreview,
    targetSegments,
    authorCity,
    isApproved: false
  });

  const populatedPost = await Post.findById(post._id).populate({
    path: 'userId',
    populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth' },
    select: 'userDetailId'
  });

  success(res, populatedPost, 'Post created successfully and pending admin approval');
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
  const userId = req.user._id;
  const { sortBy } = req.query;

  // Retrieve current user details for targeting match
  const user = await User.findById(userId).populate('userDetailId');
  const userDetail = user?.userDetailId;
  const userIndustry = userDetail?.industry || '';
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

  const orQueries = [
    // 1. User sees their own posts
    { userId: userId },

    // 2. User sees posts of connections targeted at connections or having no targetSegments
    {
      userId: { $in: connectionIds },
      $or: [
        { targetSegments: { $exists: false } },
        { 'targetSegments.connections': true },
        {
          'targetSegments.connections': false,
          'targetSegments.city': false,
          'targetSegments.industries': { $size: 0 },
          'targetSegments.ageGroups': { $size: 0 }
        }
      ]
    }
  ];

  // 3. User sees posts targeted at their industry (even if not connected)
  if (userIndustry) {
    orQueries.push({
      'targetSegments.industries': userIndustry
    });
  }

  // 4. User sees posts targeted at their city (even if not connected)
  if (userCityId) {
    orQueries.push({
      'targetSegments.city': true,
      authorCity: userCityId
    });
  }

  // 5. User sees posts targeted at their age group (even if not connected)
  if (userAgeGroup) {
    orQueries.push({
      'targetSegments.ageGroups': userAgeGroup
    });
  }

  const posts = await Post.find({
    $and: [
      { $or: orQueries },
      {
        $or: [
          { isApproved: true },
          { userId: userId }
        ]
      }
    ]
  })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage gender dateOfBirth' },
      select: 'userDetailId'
    })
    .populate({
      path: 'reactions.userId',
      populate: { path: 'userDetailId', select: 'fullName' },
      select: 'userDetailId'
    })
    .sort({ createdAt: -1 })
    .lean();

  if (sortBy === 'popularity') {
    posts.sort((a, b) => {
      const aCount = a.reactions ? a.reactions.length : 0;
      const bCount = b.reactions ? b.reactions.length : 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  success(res, posts);
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
    populate: { path: 'userDetailId', select: 'fullName' },
    select: 'userDetailId'
  });

  success(res, populatedPost.reactions, 'Reaction updated successfully');
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

module.exports = {
  createPost,
  getPosts,
  reactToPost,
  getLinkPreview
};
