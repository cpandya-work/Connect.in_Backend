const axios = require('axios');
const UserDetail = require('../models/UserDetail.model');
const User = require('../models/User.model');
const City = require('../models/City.model');

/**
 * Automatically formulate a concise, clear question using AI for every ask or share submission
 */
async function generateAiQuestion(content, postType = 'ask', targetSegments = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!content || !content.trim()) return '';

  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const isAsk = postType === 'ask';
      const systemInstruction = isAsk
        ? 'You are an AI assistant for Connect.in, a professional and community network in India. Given what the user wrote in their ask submission, formulate a single concise, clear, and natural question (10 to 18 words) that encapsulates what the user is asking. Always end with a question mark. Do not include quotes, prefixes like "Question:", or any markdown formatting. Return ONLY the question.'
        : 'You are an AI assistant for Connect.in, a professional and community network in India. The user shared an insight, experience, or update. Formulate a single compelling, natural question (10 to 18 words) that introduces what is being shared so other community members are eager to read it. Always end with a question mark. Do not include quotes, prefixes like "Question:", or any markdown formatting. Return ONLY the question.';

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: content.trim() }
          ],
          max_tokens: 60,
          temperature: 0.5
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      const q = response.data?.choices?.[0]?.message?.content?.trim();
      if (q) {
        let cleanQ = q.replace(/^["'\s]+|["'\s]+$/g, '').replace(/^Question:\s*/i, '');
        if (!cleanQ.endsWith('?')) cleanQ += '?';
        return cleanQ;
      }
    } catch (err) {
      console.error('OpenAI Question generation error:', err.message);
    }
  }

  // Fallback heuristic if API fails or offline
  const firstLine = content.trim().split('\n')[0].trim();
  if (firstLine.includes('?')) {
    const match = firstLine.match(/[^.!?]*\?/);
    if (match) return match[0].trim();
  }
  const cleanFirst = firstLine.replace(/[.!]+$/, '').slice(0, 100).trim();
  return cleanFirst.endsWith('?') ? cleanFirst : `${cleanFirst}?`;
}

/**
 * Generate AI Answer for a question using OpenAI API (with smart fallback)
 */
async function generateAiAnswer(questionContent, targetSegments = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI assistant for Connect.in, a professional and community network in India. Provide concise, practical and accurate answers. Format answers with clear numbered key points. Answer the users question directly. Do not invent facts or requirements. When information depends on location, industry or circumstances, clearly mention that.'
            },
            {
              role: 'user',
              content: `Question: "${questionContent}"`
            }
          ],
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        }
      );

      let text = '';
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const choice = response.data.choices[0];
        if (typeof choice?.message?.content === 'string') text = choice.message.content.trim();
        else if (typeof choice?.text === 'string') text = choice.text.trim();
      }

      // Ensure text is strictly a string (not an object or array)
      if (typeof text !== 'string') {
        text = String(text || '');
      }

      if (text && text.trim()) {
        return {
          content: text.trim(),
          sources: ['Community knowledge', 'Industry guidelines', 'Connect.in trusted sources'],
          createdAt: new Date()
        };
      }
    } catch (err) {
      console.error('OpenAI API call failed, using smart fallback:', err.message);
    }
  }

  // Fallback structured AI Answer when OPENAI_API_KEY is not configured or fails
  const qLower = (questionContent || '').toLowerCase();
  let fallbackPoints = [];

  if (qLower.includes('restaurant') || qLower.includes('food') || qLower.includes('cafe')) {
    fallbackPoints = [
      '1. Licenses & Approvals: FSSAI license, trade license from local Corporation, fire safety NOC, Shops & Establishments registration, GST registration.',
      '2. Location: Choose a high-footfall commercial area based on your target audience, visibility, and parking access.',
      '3. Investment & Budget: Estimate initial setup cost (kitchen equipment, interior, lease deposit, working capital for 6 months).',
      '4. Staffing & Operations: Hire experienced head chef and kitchen staff; set strict food safety standards.',
      '5. Local Preferences & Marketing: Focus on quality, local taste preferences, and leverage local social media & delivery platforms.'
    ];
  } else if (qLower.includes('business') || qLower.includes('start') || qLower.includes('company')) {
    fallbackPoints = [
      '1. Legal Entity & Registration: Choose Company (Pvt Ltd, LLP, OPC) or Partnership; register GST and MSME Udyam.',
      '2. Market Research: Validate problem-solution fit, competitor pricing, and target customer demographics.',
      '3. Financial Planning: Calculate initial capital, monthly burn rate, and projected break-even timeline.',
      '4. Team & Hiring: Focus on key technical and sales skills needed for early traction.',
      '5. Brand & Marketing: Build digital presence, network on Connect.in, and execute targeted outreach.'
    ];
  } else {
    fallbackPoints = [
      '1. Scope & Requirements: Clearly define your objectives, requirements, and key success metrics.',
      '2. Market Insights: Consult local experts and experienced members on Connect.in for insights.',
      '3. Resource Planning: Estimate budget, timeline, and essential tools or services required.',
      '4. Execution Strategy: Break down the task into actionable milestones and prioritize high-impact steps.'
    ];
  }

  const fallbackText = `Here are the key aspects to consider:\n\n${fallbackPoints.join('\n\n')}\n\nFor detailed guidance, feel free to connect with experienced members and verified businesses on Connect.in.`;

  return {
    content: fallbackText,
    sources: ['Community knowledge', 'Connect.in trusted sources'],
    createdAt: new Date()
  };
}

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

const AGE_BRACKETS = ['20-25', '26-35', '36-50', '51-65', '65+'];

function getSimilarAgeGroups(ageGroup) {
  if (!ageGroup) return AGE_BRACKETS;
  const idx = AGE_BRACKETS.indexOf(ageGroup);
  if (idx === -1) return [ageGroup];
  const similar = [AGE_BRACKETS[idx]];
  if (idx > 0) similar.push(AGE_BRACKETS[idx - 1]);
  if (idx < AGE_BRACKETS.length - 1) similar.push(AGE_BRACKETS[idx + 1]);
  return similar;
}

/**
 * Recommend People and Businesses who can help answer/fulfill a question
 */
async function recommendPeopleAndBusinesses(questionContent, targetSegments = {}, currentUserId = null) {
  try {
    const isPeopleWhoCanHelp = targetSegments.audienceType === 'help';
    const maxLimit = isPeopleWhoCanHelp ? 500 : 3;

    // Fetch all cities for safe lookup (handles both ObjectId refs and plain string city names)
    const allCities = await City.find({}).lean();
    const cityMap = new Map(allCities.map(c => [String(c._id), c.name]));
    const resolveCityName = (cityField) => {
      if (!cityField) return '';
      if (typeof cityField === 'object' && cityField._id) {
        return (cityField.name || cityMap.get(String(cityField._id)) || '').trim();
      }
      const strVal = String(cityField).trim();
      return (cityMap.get(strVal) || strVal).trim();
    };

    // Get author details (city and age) for restricting when audience is 'help'
    let authorCityName = '';
    let authorCityIdStr = '';
    let authorAgeGroup = null;

    if (currentUserId) {
      const authorUser = await User.findById(currentUserId)
        .populate('userDetailId')
        .lean();
      const authorDetail = authorUser?.userDetailId;
      if (authorDetail) {
        if (authorDetail.city) {
          authorCityName = resolveCityName(authorDetail.city).toLowerCase();
          authorCityIdStr = String(authorDetail.city._id || authorDetail.city);
        }
        if (authorDetail.dateOfBirth) {
          authorAgeGroup = getAgeGroup(authorDetail.dateOfBirth);
        }
      }
    }

    const cityLoc = (targetSegments.cityLocation || authorCityName || '').toLowerCase();
    const similarAgeGroups = targetSegments.ageGroups && targetSegments.ageGroups.length > 0
      ? targetSegments.ageGroups
      : getSimilarAgeGroups(authorAgeGroup);

    const qLower = (questionContent || '').toLowerCase();
    const targetIndustries = (targetSegments.industries || []).map(i => i.toLowerCase());
    const targetInterests = (targetSegments.interests || []).map(i => i.toLowerCase());

    // Fetch users populated with user detail safely
    const allUsers = await User.find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
      .populate('userDetailId')
      .lean();

    const peopleList = [];
    const businessList = [];

    for (const u of allUsers) {
      if (!u || !u.userDetailId) continue;
      const detail = u.userDetailId;
      // Skip asking user
      if (currentUserId && (String(u._id) === String(currentUserId) || String(detail._id) === String(currentUserId))) continue;

      const cityName = resolveCityName(detail.city).toLowerCase();
      const cityIdStr = String(detail.city?._id || detail.city || '');

      // When 'People who can help' is selected: Restrict prospects to same city and similar age groups
      if (isPeopleWhoCanHelp) {
        // 1. Same City restriction
        if (authorCityIdStr || authorCityName || cityLoc) {
          const isSameCity = Boolean(
            (authorCityIdStr && cityIdStr && authorCityIdStr === cityIdStr) ||
            (authorCityName && cityName && (authorCityName.includes(cityName) || cityName.includes(authorCityName))) ||
            (cityLoc && cityName && cityName.includes(cityLoc))
          );
          if (!isSameCity) continue;
        }

        // 2. Similar Age Group restriction (for people profiles)
        if (!detail.isBusinessProfile) {
          const candidateAgeGroup = detail.dateOfBirth ? getAgeGroup(detail.dateOfBirth) : null;
          if (candidateAgeGroup && similarAgeGroups && similarAgeGroups.length > 0) {
            if (!similarAgeGroups.includes(candidateAgeGroup)) continue;
          }
        }
      }

      const industryStr = (detail.industry || detail.businessCategory?.name || '').toLowerCase();
      const positionStr = (detail.position || '').toLowerCase();
      const skillsStr = (detail.skills || []).join(' ').toLowerCase();
      const interestsStr = (detail.interests || []).join(' ').toLowerCase();
      const descStr = (detail.businessDescription || detail.businessTagline || '').toLowerCase();
      const combinedText = `${detail.fullName || ''} ${detail.businessName || ''} ${cityName} ${industryStr} ${positionStr} ${skillsStr} ${interestsStr} ${descStr}`.toLowerCase();

      // Relevance Score calculation
      let score = 0;

      // Question content matching
      if (qLower.length > 0) {
        const words = qLower.split(/\s+/).filter(w => w.length > 3);
        words.forEach(word => {
          if (combinedText.includes(word)) score += 3;
        });
      }

      // City match bonus
      if (cityLoc && cityName.toLowerCase().includes(cityLoc)) {
        score += 10;
      }

      // Industry / Interest match bonus
      targetIndustries.forEach(ind => {
        if (combinedText.includes(ind)) score += 8;
      });
      targetInterests.forEach(interest => {
        if (combinedText.includes(interest)) score += 8;
      });

      // Business vs Person categorization
      if (detail.isBusinessProfile) {
        if (detail.businessApprovalStatus === 'rejected') continue;
        businessList.push({
          user: u,
          userDetail: detail,
          score: score + (detail.businessApprovalStatus === 'approved' ? 5 : 0)
        });
      } else {
        peopleList.push({
          user: u,
          userDetail: detail,
          score
        });
      }
    }

    // Sort by score descending
    peopleList.sort((a, b) => b.score - a.score);
    businessList.sort((a, b) => b.score - a.score);

    // Matching People (up to 500 when 'People who can help' is selected, else 3)
    const realPeople = peopleList.slice(0, maxLimit).map(item => {
      const u = item.user;
      const d = item.userDetail;
      const resolvedName = resolveCityName(d.city);
      const cityName = resolvedName ? (resolvedName.includes('India') ? resolvedName : `${resolvedName}, India`) : '';
      return {
        user: u._id,
        fullName: d.fullName || 'Connect Member',
        position: d.position || d.industry || 'Professional',
        city: cityName,
        profileImage: d.profileImage || '',
        gender: d.gender || 'Other',
        dateOfBirth: d.dateOfBirth || null
      };
    });

    // Matching Businesses (up to 500 when 'People who can help' is selected, else 3)
    const realBusinesses = businessList.slice(0, maxLimit).map(item => {
      const u = item.user;
      const d = item.userDetail;
      const resolvedName = resolveCityName(d.city);
      const cityName = resolvedName ? (resolvedName.includes('India') ? resolvedName : `${resolvedName}, India`) : '';
      return {
        user: u._id,
        businessName: d.businessName || 'Connect Business',
        businessCategory: d.businessTagline || d.industry || 'Verified Business Services',
        city: cityName,
        businessLogo: d.businessLogo || ''
      };
    });

    return {
      people: realPeople,
      businesses: realBusinesses
    };
  } catch (err) {
    console.error('Error generating profile recommendations:', err);
    return { people: [], businesses: [] };
  }
}

/**
 * Rank candidate profiles using AI Profile-to-Profile matching logic.
 * Matches logged-in user's profile summary (industry, position, skills, interests, habits, sports, location)
 * against candidate profiles.
 */
function rankProfilesByAiProfileMatch(loggedInUserDetail, candidateProfiles) {
  if (!loggedInUserDetail || !Array.isArray(candidateProfiles) || candidateProfiles.length === 0) {
    return candidateProfiles;
  }

  const userCityName = (loggedInUserDetail.city?.name || loggedInUserDetail.city || '').toString().toLowerCase();
  const userIndustry = (loggedInUserDetail.industry || loggedInUserDetail.businessCategory?.name || '').toString().toLowerCase();
  const userPosition = (loggedInUserDetail.position || '').toString().toLowerCase();
  const userCompany = (loggedInUserDetail.company || '').toString().toLowerCase();
  const userSkills = (loggedInUserDetail.skills || []).map(s => String(s).toLowerCase());
  const userInterests = (loggedInUserDetail.interests || []).map(i => String(i).toLowerCase());
  const userHabits = (loggedInUserDetail.habits || []).map(h => String(h).toLowerCase());
  const userSports = (loggedInUserDetail.sports || []).map(s => String(s).toLowerCase());
  const userDesc = (loggedInUserDetail.businessDescription || loggedInUserDetail.businessTagline || '').toString().toLowerCase();

  const userSummaryText = `${loggedInUserDetail.fullName || ''} ${loggedInUserDetail.businessName || ''} ${userCityName} ${userIndustry} ${userPosition} ${userCompany} ${userSkills.join(' ')} ${userInterests.join(' ')} ${userHabits.join(' ')} ${userSports.join(' ')} ${userDesc}`.toLowerCase();
  const userTokens = userSummaryText.split(/\s+/).filter(w => w.length > 3);

  const scoredProfiles = candidateProfiles.map(profile => {
    let score = 0;
    const matchReasons = [];

    const cityName = (profile.city || profile.cityName || '').toString().toLowerCase();
    const industry = (profile.industry || profile.businessCategory || '').toString().toLowerCase();
    const position = (profile.position || '').toString().toLowerCase();
    const company = (profile.company || '').toString().toLowerCase();
    const skills = (profile.skills || []).map(s => String(s).toLowerCase());
    const interests = (profile.interests || []).map(i => String(i).toLowerCase());
    const habits = (profile.habits || []).map(h => String(h).toLowerCase());
    const sports = (profile.sports || []).map(s => String(s).toLowerCase());
    const candidateName = (profile.businessName || profile.fullName || profile.name || '').toString().toLowerCase();

    const candidateSummaryText = `${candidateName} ${cityName} ${industry} ${position} ${company} ${skills.join(' ')} ${interests.join(' ')} ${habits.join(' ')} ${sports.join(' ')}`.toLowerCase();

    // 1. Industry / Category Match
    if (userIndustry && industry && (userIndustry.includes(industry) || industry.includes(userIndustry))) {
      score += 15;
      matchReasons.push('Industry match');
    }

    // 2. Skills Match
    const matchingSkills = userSkills.filter(s => s && (skills.includes(s) || candidateSummaryText.includes(s)));
    if (matchingSkills.length > 0) {
      score += matchingSkills.length * 10;
      matchReasons.push('Skills match');
    }

    // 3. Interests Match
    const matchingInterests = userInterests.filter(i => i && (interests.includes(i) || candidateSummaryText.includes(i)));
    if (matchingInterests.length > 0) {
      score += matchingInterests.length * 10;
      matchReasons.push('Interests match');
    }

    // 4. Lifestyle Match (Habits / Sports)
    const matchingHabits = userHabits.filter(h => h && (habits.includes(h) || candidateSummaryText.includes(h)));
    const matchingSports = userSports.filter(sp => sp && (sports.includes(sp) || candidateSummaryText.includes(sp)));
    if (matchingHabits.length > 0 || matchingSports.length > 0) {
      score += (matchingHabits.length + matchingSports.length) * 5;
      matchReasons.push('Lifestyle match');
    }

    // 5. City Proximity
    if (userCityName && cityName && (userCityName.includes(cityName) || cityName.includes(userCityName))) {
      score += 10;
      matchReasons.push('Location match');
    }

    // 6. Text similarity score
    userTokens.forEach(token => {
      if (candidateSummaryText.includes(token)) {
        score += 2;
      }
    });

    return {
      profile,
      score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['AI Match']
    };
  });

  // Sort descending by AI match score
  scoredProfiles.sort((a, b) => b.score - a.score);

  return scoredProfiles.map(item => ({
    ...item.profile,
    aiMatchScore: item.score,
    aiMatchReasons: item.matchReasons
  }));
}

module.exports = {
  generateAiQuestion,
  generateAiAnswer,
  recommendPeopleAndBusinesses,
  rankProfilesByAiProfileMatch
};
