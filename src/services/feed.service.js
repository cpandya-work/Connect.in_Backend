const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const UserSkips = require('../models/UserSkips.model');
const City = require('../models/City.model');
const mongoose = require('mongoose');

const getMatchingCityConditions = async (userCity) => {
  if (!userCity) return null;

  const cityIds = new Set();
  const cityNames = new Set();
  let cityName = null;

  if (mongoose.Types.ObjectId.isValid(userCity)) {
    const cityIdStr = userCity.toString();
    cityIds.add(cityIdStr);
    try {
      const cityDoc = await City.findById(userCity);
      if (cityDoc && cityDoc.name) {
        cityName = cityDoc.name.trim();
      }
    } catch (e) {
      console.error('Error finding city by id:', e);
    }
  } else if (typeof userCity === 'string' && userCity.trim()) {
    cityName = userCity.trim();
    cityNames.add(cityName);
  }

  if (cityName) {
    cityNames.add(cityName);
    let searchRegex = `^${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
    if (/^bangalore$/i.test(cityName) || /^bengaluru$/i.test(cityName)) {
      searchRegex = '^(bangalore|bengaluru)$';
      cityNames.add('Bangalore');
      cityNames.add('Bengaluru');
      cityNames.add('bangalore');
      cityNames.add('bengaluru');
    }

    try {
      const matchingCities = await City.find({
        name: { $regex: searchRegex, $options: 'i' }
      });
      matchingCities.forEach(c => {
        cityIds.add(c._id.toString());
        if (c.name) cityNames.add(c.name);
      });
    } catch (e) {
      console.error('Error finding cities by name:', e);
    }
  }

  const conditions = [];

  cityIds.forEach(id => {
    if (mongoose.Types.ObjectId.isValid(id)) {
      conditions.push({ 'details.city': new mongoose.Types.ObjectId(id) });
    }
    conditions.push({ 'details.city': id });
  });

  cityNames.forEach(name => {
    conditions.push({ 'details.city': name });
    conditions.push({ 'details.city': { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  });

  if (conditions.length === 1) return conditions[0];
  if (conditions.length > 1) return { $or: conditions };
  return null;
};

const getFeed = async (userId, userGender, cursor = null, limit = 20, filters = {}, search = '', userLocation = null, userCity = null) => {
  const cursorObj = cursor ? new mongoose.Types.ObjectId(cursor) : null;

  // Build excluded user IDs and get logged-in user details
  const [liked, sentReq, receivedReq, connections, skippedByMe, skippedMe, loggedInUserDoc] = await Promise.all([
    UserLikes.find({ userId }).select('likedUserId'),
    UserRequests.find({ senderId: userId, status: 'pending' }).select('receiverId'),
    UserRequests.find({ receiverId: userId, status: 'pending' }).select('senderId'),
    UserConnections.find({
      $or: [{ connection1Id: userId }, { connection2Id: userId }],
    }),
    UserSkips.find({ userId }).select('skippedUserId'),
    UserSkips.find({ skippedUserId: userId }).select('userId'),
    User.findById(userId).populate('userDetailId').select('userDetailId')
  ]);

  const loggedInPincode = loggedInUserDoc?.userDetailId?.pincode ? loggedInUserDoc.userDetailId.pincode.toString().trim() : null;

  const excludedIds = new Set();

  // Build sets for flag decoration (liked, sent/received requests & connections stay in feed)
  const likedSet = new Set(liked.map(l => l.likedUserId.toString()));
  const sentReqSet = new Set(sentReq.map(r => r.receiverId.toString()));
  const receivedReqSet = new Set(receivedReq.map(r => r.senderId.toString()));
  const connectedSet = new Set();
  connections.forEach(c => {
    const connId = c.connection1Id.toString() === userId.toString()
      ? c.connection2Id.toString()
      : c.connection1Id.toString();
    connectedSet.add(connId);
  });

  // Add users I skipped
  skippedByMe.forEach(s => excludedIds.add(s.skippedUserId.toString()));

  // Add users who skipped me (bidirectional exclusion)
  skippedMe.forEach(s => excludedIds.add(s.userId.toString()));

  // Add self
  excludedIds.add(userId.toString());

  // Build match stage with filters
  const matchStage = {
    _id: {
      $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)),
    },
    'details.isBusinessProfile': { $ne: true }
  };

  // Apply gender filter only if specified
  if (filters.gender && filters.gender !== 'any') {
    matchStage['details.gender'] = filters.gender;
  }

  // Apply search filter
  if (search && search.trim()) {
    matchStage['details.fullName'] = { $regex: search.trim(), $options: 'i' };
  }

  // Apply city filter - show only profiles in the same city as the logged-in user
  // Skip city filter when search is active (to search across all cities)
  if (userCity && (!search || !search.trim())) {
    const cityCond = await getMatchingCityConditions(userCity);
    if (cityCond) {
      if (cityCond.$or) {
        matchStage.$and = matchStage.$and || [];
        matchStage.$and.push({ $or: cityCond.$or });
      } else {
        Object.assign(matchStage, cityCond);
      }
    }
  }

  // Apply filters if provided
  if (filters.habits && filters.habits.length > 0) {
    matchStage['details.habits'] = { $in: filters.habits };
  }

  if (filters.interests && filters.interests.length > 0) {
    matchStage['details.interests'] = { $in: filters.interests };
  }

  if (filters.language && filters.language.length > 0) {
    matchStage['details.preferredLanguage'] = { $in: filters.language };
  }

  if (filters.relationship && filters.relationship.length > 0) {
    matchStage['details.status'] = { $in: filters.relationship };
  }

  if (filters.religion && filters.religion.length > 0) {
    matchStage['details.religion'] = { $in: filters.religion };
  }

  if (filters.company && filters.company.length > 0) {
    // Company is stored as String in database, so match as strings
    matchStage['details.company'] = { $in: filters.company };
  }

  if (filters.industry && filters.industry.length > 0) {
    // Industry is stored as String in database, so match as strings
    matchStage['details.industry'] = { $in: filters.industry };
  }

  if (filters.sports && filters.sports.length > 0) {
    matchStage['details.sports'] = { $in: filters.sports };
  }

  if (cursorObj) {
    matchStage._id = { ...matchStage._id, $lt: cursorObj };
  }

  let pipeline = [];

  // Add location-based filtering if user location is provided
  if (userLocation && userLocation.coordinates && userLocation.coordinates[0] !== 0 && userLocation.coordinates[1] !== 0) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: userLocation.coordinates // [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: 100000, // 100km in meters
        spherical: true
      }
    });
  }

  pipeline = pipeline.concat([
    {
      $lookup: {
        from: 'userdetails',
        localField: 'userDetailId',
        foreignField: '_id',
        as: 'details',
      },
    },
    { $unwind: '$details' },
    { $match: matchStage },
    {
      $lookup: {
        from: 'cities',
        localField: 'details.city',
        foreignField: '_id',
        as: 'cityInfo',
      },
    },
    {
      $lookup: {
        from: 'industries',
        let: { industryId: '$details.industry' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$_id', '$$industryId'] },
                  {
                    $and: [
                      { $eq: [{ $type: '$$industryId' }, 'string'] },
                      { $eq: [{ $strLenCP: { $cond: { if: { $eq: [{ $type: '$$industryId' }, 'string'] }, then: '$$industryId', else: '' } } }, 24] },
                      { $eq: ['$_id', { $convert: { input: '$$industryId', to: 'objectId', onError: null, onNull: null } }] }
                    ]
                  }
                ]
              }
            }
          }
        ],
        as: 'industryInfo',
      },
    },
    {
      $addFields: {
        cityName: { $arrayElemAt: ['$cityInfo.name', 0] },
        cityId: '$details.city',
        industryName: {
          $ifNull: [
            { $arrayElemAt: ['$industryInfo.name', 0] },
            '$details.industry'
          ]
        },
      },
    },
    { $sort: userLocation ? { distance: 1, _id: -1 } : { _id: -1 } },
    {
      $project: {
        id: '$_id',
        fullName: '$details.fullName',
        profileImage: '$details.profileImage',
        dateOfBirth: '$details.dateOfBirth',
        city: '$cityName',
        cityId: '$cityId',
        gender: '$details.gender',
        religion: '$details.religion',
        status: '$details.status',
        industry: '$industryName',
        distance: userLocation ? '$distance' : undefined,
        pincode: '$details.pincode',
      },
    },
  ]);

  let result = await User.aggregate(pipeline);

  // Convert distance from meters to kilometers
  if (userLocation) {
    result = result.map(p => ({
      ...p,
      distance: p.distance ? Math.round(p.distance / 1000 * 10) / 10 : null // Round to 1 decimal
    }));
  }

  // Calculate age and apply age filter
  result = result.map(p => ({
    ...p,
    age: p.dateOfBirth
      ? Math.floor((Date.now() - new Date(p.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }));

  // Apply age filter if provided
  if (filters.ageMin || filters.ageMax) {
    result = result.filter(p => {
      if (!p.age) return false;
      if (filters.ageMin && p.age < filters.ageMin) return false;
      if (filters.ageMax && p.age > filters.ageMax) return false;
      return true;
    });
  }

  // Decorate each profile with isLiked / isConnected flags
  result = result.map(p => {
    const profileIdStr = (p.id || p._id).toString();
    const alreadyConnect = connectedSet.has(profileIdStr);
    const sendRequest = sentReqSet.has(profileIdStr);
    return {
      ...p,
      isLiked: likedSet.has(profileIdStr),
      isConnected: sendRequest || receivedReqSet.has(profileIdStr) || alreadyConnect,
      alreadyConnect,
      sendRequest,
    };
  });

  // Group by pincode matching if logged-in user has a pincode
  if (loggedInPincode) {
    const matchingProfiles = result.filter(p => p.pincode && p.pincode.toString().trim() === loggedInPincode);
    const nonMatchingProfiles = result.filter(p => !p.pincode || p.pincode.toString().trim() !== loggedInPincode);

    for (let i = matchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchingProfiles[i], matchingProfiles[j]] = [matchingProfiles[j], matchingProfiles[i]];
    }
    for (let i = nonMatchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonMatchingProfiles[i], nonMatchingProfiles[j]] = [nonMatchingProfiles[j], nonMatchingProfiles[i]];
    }

    result = matchingProfiles.concat(nonMatchingProfiles);
  } else {
    // Shuffle the results to display users randomly
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  }

  const hasMore = result.length > limit;
  const profiles = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? profiles[profiles.length - 1].id : null;

  return { profiles, nextCursor };
};

const getFeedWeb = async (userId, userGender, page = 1, limit = 20, filters = {}, search = '', userLocation = null, userCity = null) => {
  console.log(userLocation,'userLocation service');
  console.log(userCity,'userCity');
  
  // Build excluded user IDs and get logged-in user details
  const [liked, sentReq, receivedReq, connections, skippedByMe, skippedMe, loggedInUserDoc] = await Promise.all([
    UserLikes.find({ userId }).select('likedUserId'),
    UserRequests.find({ senderId: userId, status: 'pending' }).select('receiverId'),
    UserRequests.find({ receiverId: userId, status: 'pending' }).select('senderId'),
    UserConnections.find({
      $or: [{ connection1Id: userId }, { connection2Id: userId }],
    }),
    UserSkips.find({ userId }).select('skippedUserId'),
    UserSkips.find({ skippedUserId: userId }).select('userId'),
    User.findById(userId).populate('userDetailId').select('userDetailId')
  ]);

  const loggedInPincode = loggedInUserDoc?.userDetailId?.pincode ? loggedInUserDoc.userDetailId.pincode.toString().trim() : null;

  const excludedIds = new Set();

  // Build sets for flag decoration (liked, sent/received requests & connections stay in feed)
  const likedSet = new Set(liked.map(l => l.likedUserId.toString()));
  const sentReqSet = new Set(sentReq.map(r => r.receiverId.toString()));
  const receivedReqSet = new Set(receivedReq.map(r => r.senderId.toString()));
  const connectedSet = new Set();
  connections.forEach(c => {
    const connId = c.connection1Id.toString() === userId.toString()
      ? c.connection2Id.toString()
      : c.connection1Id.toString();
    connectedSet.add(connId);
  });

  // Add users I skipped
  skippedByMe.forEach(s => excludedIds.add(s.skippedUserId.toString()));

  // Add users who skipped me (bidirectional exclusion)
  skippedMe.forEach(s => excludedIds.add(s.userId.toString()));

  // Add self
  excludedIds.add(userId.toString());

  // Build match stage with filters
  const matchStage = {
    _id: {
      $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)),
    },
    'details.isBusinessProfile': { $ne: true }
  };

  // Apply gender filter only if specified
  if (filters.gender && filters.gender !== 'any') {
    matchStage['details.gender'] = filters.gender;
  }

  // Apply search filter
  if (search && search.trim()) {
    matchStage['details.fullName'] = { $regex: search.trim(), $options: 'i' };
  }
  console.log(userCity,'userCity');

  // Apply city filter - skip when search is active (to search across all cities)
  if (userCity && (!search || !search.trim())) {
    const cityCond = await getMatchingCityConditions(userCity);
    if (cityCond) {
      if (cityCond.$or) {
        matchStage.$and = matchStage.$and || [];
        matchStage.$and.push({ $or: cityCond.$or });
      } else {
        Object.assign(matchStage, cityCond);
      }
    }
  }

  // Apply filters if provided
  if (filters.habits && filters.habits.length > 0) {
    matchStage['details.habits'] = { $in: filters.habits };
  }

  if (filters.interests && filters.interests.length > 0) {
    matchStage['details.interests'] = { $in: filters.interests };
  }

  if (filters.language && filters.language.length > 0) {
    matchStage['details.preferredLanguage'] = { $in: filters.language };
  }

  if (filters.relationship && filters.relationship.length > 0) {
    matchStage['details.status'] = { $in: filters.relationship };
  }

  if (filters.religion && filters.religion.length > 0) {
    matchStage['details.religion'] = { $in: filters.religion };
  }

  if (filters.company && filters.company.length > 0) {
    // Company is stored as String in database, so match as strings
    matchStage['details.company'] = { $in: filters.company };
  }

  if (filters.industry && filters.industry.length > 0) {
    // Industry is stored as String in database, so match as strings
    matchStage['details.industry'] = { $in: filters.industry };
  }

  if (filters.sports && filters.sports.length > 0) {
    matchStage['details.sports'] = { $in: filters.sports };
  }

  let pipeline = [];

  // Add location-based filtering if user location is provided
  if (userLocation && userLocation.coordinates && userLocation.coordinates[0] !== 0 && userLocation.coordinates[1] !== 0) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: userLocation.coordinates // [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: 100000, // 100km in meters
        spherical: true
      }
    });
  }

  console.log(userLocation,'userLocation');
  
  pipeline = pipeline.concat([
    {
      $lookup: {
        from: 'userdetails',
        localField: 'userDetailId',
        foreignField: '_id',
        as: 'details',
      },
    },
    { $unwind: '$details' },
    { $match: matchStage },
    {
      $lookup: {
        from: 'cities',
        localField: 'details.city',
        foreignField: '_id',
        as: 'cityInfo',
      },
    },
    {
      $lookup: {
        from: 'industries',
        let: { industryId: '$details.industry' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$_id', '$$industryId'] },
                  {
                    $and: [
                      { $eq: [{ $type: '$$industryId' }, 'string'] },
                      { $eq: [{ $strLenCP: { $cond: { if: { $eq: [{ $type: '$$industryId' }, 'string'] }, then: '$$industryId', else: '' } } }, 24] },
                      { $eq: ['$_id', { $convert: { input: '$$industryId', to: 'objectId', onError: null, onNull: null } }] }
                    ]
                  }
                ]
              }
            }
          }
        ],
        as: 'industryInfo',
      },
    },
    {
      $addFields: {
        cityName: { $arrayElemAt: ['$cityInfo.name', 0] },
        cityId: '$details.city',
        industryName: {
          $ifNull: [
            { $arrayElemAt: ['$industryInfo.name', 0] },
            '$details.industry'
          ]
        },
      },
    },
    { $sort: userLocation ? { distance: 1, _id: -1 } : { _id: -1 } },
    {
      $project: {
        id: '$_id',
        fullName: '$details.fullName',
        profileImage: '$details.profileImage',
        dateOfBirth: '$details.dateOfBirth',
        city: '$cityName',
        cityId: '$cityId',
        gender: '$details.gender',
        religion: '$details.religion',
        status: '$details.status',
        industry: '$industryName',
        distance: userLocation ? '$distance' : undefined,
        pincode: '$details.pincode',
      },
    },
  ]);

  console.log(pipeline,'pipeline');
  console.log(matchStage,'matchStage');
  
  let result = await User.aggregate(pipeline);

  // Convert distance from meters to kilometers
  if (userLocation) {
    result = result.map(p => ({
      ...p,
      distance: p.distance ? Math.round(p.distance / 1000 * 10) / 10 : null // Round to 1 decimal
    }));
  }

  // Calculate age and apply age filter
  result = result.map(p => ({
    ...p,
    age: p.dateOfBirth
      ? Math.floor((Date.now() - new Date(p.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }));

  // Apply age filter if provided
  if (filters.ageMin || filters.ageMax) {
    result = result.filter(p => {
      if (!p.age) return false;
      if (filters.ageMin && p.age < filters.ageMin) return false;
      if (filters.ageMax && p.age > filters.ageMax) return false;
      return true;
    });
  }

  // Decorate each profile with isLiked / isConnected flags
  result = result.map(p => {
    const profileIdStr = (p.id || p._id).toString();
    const alreadyConnect = connectedSet.has(profileIdStr);
    const sendRequest = sentReqSet.has(profileIdStr);
    return {
      ...p,
      isLiked: likedSet.has(profileIdStr),
      isConnected: sendRequest || receivedReqSet.has(profileIdStr) || alreadyConnect,
      alreadyConnect,
      sendRequest,
    };
  });

  // Group by pincode matching if logged-in user has a pincode
  if (loggedInPincode) {
    const matchingProfiles = result.filter(p => p.pincode && p.pincode.toString().trim() === loggedInPincode);
    const nonMatchingProfiles = result.filter(p => !p.pincode || p.pincode.toString().trim() !== loggedInPincode);

    for (let i = matchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchingProfiles[i], matchingProfiles[j]] = [matchingProfiles[j], matchingProfiles[i]];
    }
    for (let i = nonMatchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonMatchingProfiles[i], nonMatchingProfiles[j]] = [nonMatchingProfiles[j], nonMatchingProfiles[i]];
    }

    result = matchingProfiles.concat(nonMatchingProfiles);
  } else {
    // Shuffle the results to display users randomly
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  }

  // Calculate pagination
  const totalCount = result.length;
  const skip = (page - 1) * limit;
  const profiles = result.slice(skip, skip + limit);
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return { 
    profiles, 
    pagination: {
      currentPage: page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
};

const getBusinessFeed = async (userId, page = 1, limit = 20, filters = {}, search = '', userCity = null) => {
  // Build excluded user IDs and get logged-in user details
  const [liked, sentReq, receivedReq, connections, skippedByMe, skippedMe, loggedInUserDoc] = await Promise.all([
    UserLikes.find({ userId }).select('likedUserId'),
    UserRequests.find({ senderId: userId, status: 'pending' }).select('receiverId'),
    UserRequests.find({ receiverId: userId, status: 'pending' }).select('senderId'),
    UserConnections.find({
      $or: [{ connection1Id: userId }, { connection2Id: userId }],
    }),
    UserSkips.find({ userId }).select('skippedUserId'),
    UserSkips.find({ skippedUserId: userId }).select('userId'),
    User.findById(userId).populate('userDetailId').select('userDetailId')
  ]);

  const loggedInPincode = loggedInUserDoc?.userDetailId?.pincode ? loggedInUserDoc.userDetailId.pincode.toString().trim() : null;

  const excludedIds = new Set();

  // Build sets for flag decoration (liked, sent/received requests & connections stay in feed)
  const likedSet = new Set(liked.map(l => l.likedUserId.toString()));
  const sentReqSet = new Set(sentReq.map(r => r.receiverId.toString()));
  const receivedReqSet = new Set(receivedReq.map(r => r.senderId.toString()));
  const connectedSet = new Set();
  connections.forEach(c => {
    const connId = c.connection1Id.toString() === userId.toString()
      ? c.connection2Id.toString()
      : c.connection1Id.toString();
    connectedSet.add(connId);
  });

  // Add users I skipped
  skippedByMe.forEach(s => excludedIds.add(s.skippedUserId.toString()));

  // Add users who skipped me (bidirectional exclusion)
  skippedMe.forEach(s => excludedIds.add(s.userId.toString()));

  // Add self
  excludedIds.add(userId.toString());

  const matchStage = {
    _id: {
      $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)),
    },
    'details.isBusinessProfile': true
  };

  // Filter by business category if provided
  if (filters.category) {
    matchStage['details.businessCategory'] = new mongoose.Types.ObjectId(filters.category);
  }

  // Filter by city if userCity is provided and search is not active
  if (userCity && (!search || !search.trim())) {
    const cityCond = await getMatchingCityConditions(userCity);
    if (cityCond) {
      if (cityCond.$or) {
        matchStage.$and = matchStage.$and || [];
        matchStage.$and.push({ $or: cityCond.$or });
      } else {
        Object.assign(matchStage, cityCond);
      }
    }
  }

  // Filter by search query (businessName or businessTagline)
  if (search && search.trim()) {
    matchStage['details.businessName'] = { $regex: search.trim(), $options: 'i' };
  }

  let pipeline = [
    {
      $lookup: {
        from: 'userdetails',
        localField: 'userDetailId',
        foreignField: '_id',
        as: 'details',
      },
    },
    { $unwind: '$details' },
    { $match: matchStage },
    {
      $lookup: {
        from: 'cities',
        localField: 'details.city',
        foreignField: '_id',
        as: 'cityInfo',
      },
    },
    {
      $lookup: {
        from: 'businesscategories',
        localField: 'details.businessCategory',
        foreignField: '_id',
        as: 'categoryInfo',
      },
    },
    {
      $addFields: {
        cityName: {
          $ifNull: [
            { $arrayElemAt: ['$cityInfo.name', 0] },
            {
              $cond: {
                if: { $eq: [{ $type: '$details.city' }, 'string'] },
                then: '$details.city',
                else: null
              }
            }
          ]
        },
        cityId: '$details.city',
        businessCategoryName: { $arrayElemAt: ['$categoryInfo.name', 0] }
      },
    },
    { $sort: { _id: -1 } },
    {
      $project: {
        id: '$_id',
        isBusinessProfile: '$details.isBusinessProfile',
        businessName: '$details.businessName',
        businessLogo: '$details.businessLogo',
        businessCoverImage: '$details.businessCoverImage',
        businessTagline: '$details.businessTagline',
        businessCategory: '$businessCategoryName',
        businessCategoryId: '$details.businessCategory',
        city: '$cityName',
        cityId: '$cityId',
        website: '$details.website',
        contactPerson: '$details.contactPerson',
        whatsappNumber: '$details.whatsappNumber',
        facebook: '$details.facebook',
        instagram: '$details.instagram',
        linkedIn: '$details.linkedIn',
        youtube: '$details.youtube',
        twitter: '$details.twitter',
        pincode: '$details.pincode',
      },
    },
  ];

  let result = await User.aggregate(pipeline);

  // Decorate each profile with isLiked / isConnected flags
  const decoratedProfiles = result.map(p => {
    const profileIdStr = (p.id || p._id).toString();
    const alreadyConnect = connectedSet.has(profileIdStr);
    const sendRequest = sentReqSet.has(profileIdStr);
    return {
      ...p,
      isLiked: likedSet.has(profileIdStr),
      isConnected: sendRequest || receivedReqSet.has(profileIdStr) || alreadyConnect,
      alreadyConnect,
      sendRequest,
    };
  });

  let finalProfiles = decoratedProfiles;
  // Group by pincode matching if logged-in user has a pincode
  if (loggedInPincode) {
    const matchingProfiles = decoratedProfiles.filter(p => p.pincode && p.pincode.toString().trim() === loggedInPincode);
    const nonMatchingProfiles = decoratedProfiles.filter(p => !p.pincode || p.pincode.toString().trim() !== loggedInPincode);

    for (let i = matchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchingProfiles[i], matchingProfiles[j]] = [matchingProfiles[j], matchingProfiles[i]];
    }
    for (let i = nonMatchingProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonMatchingProfiles[i], nonMatchingProfiles[j]] = [nonMatchingProfiles[j], nonMatchingProfiles[i]];
    }

    finalProfiles = matchingProfiles.concat(nonMatchingProfiles);
  } else {
    // Shuffle the results to display businesses randomly
    for (let i = decoratedProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [decoratedProfiles[i], decoratedProfiles[j]] = [decoratedProfiles[j], decoratedProfiles[i]];
    }
  }

  const skip = (page - 1) * limit;
  const hasMore = finalProfiles.length > skip + limit;
  const profiles = finalProfiles.slice(skip, skip + limit);

  return {
    profiles,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
};

module.exports = { getFeed, getFeedWeb, getBusinessFeed };