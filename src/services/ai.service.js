const axios = require('axios');
const UserDetail = require('../models/UserDetail.model');
const User = require('../models/User.model');

/**
 * Generate AI Answer for a question using OpenAI API (with smart fallback)
 */
async function generateAiAnswer(questionContent, targetSegments = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/responses',
        {
          model: 'gpt-6-luna',
          reasoning: {
            effort: 'none'
          },
          instructions: 'You are an expert AI assistant for Connect.in, a professional and community network in India. Provide concise, practical and accurate answers. Format answers with clear numbered key points. Answer the users question directly. Do not invent facts or requirements. When information depends on location, industry or circumstances, clearly mention that.',
          input: `Question: "${questionContent}"`,
          max_output_tokens: 800
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
      if (response.data) {
        if (typeof response.data.output_text === 'string' && response.data.output_text.trim()) {
          text = response.data.output_text.trim();
        } else if (typeof response.data.output === 'string' && response.data.output.trim()) {
          text = response.data.output.trim();
        } else if (Array.isArray(response.data.output)) {
          const pieces = response.data.output.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item.text === 'string') return item.text;
            if (item && typeof item.content === 'string') return item.content;
            if (item && Array.isArray(item.content)) {
              return item.content.map(c => (typeof c === 'string' ? c : c?.text || '')).join('');
            }
            return '';
          }).filter(Boolean);
          text = pieces.join('\n\n').trim();
        } else if (Array.isArray(response.data.output_text)) {
          const pieces = response.data.output_text.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item.text === 'string') return item.text;
            return '';
          }).filter(Boolean);
          text = pieces.join('\n\n').trim();
        } else if (Array.isArray(response.data.choices) && response.data.choices.length > 0) {
          const choice = response.data.choices[0];
          if (typeof choice?.message?.content === 'string') text = choice.message.content.trim();
          else if (typeof choice?.text === 'string') text = choice.text.trim();
        }
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

/**
 * Recommend People and Businesses who can help answer/fulfill a question
 */
async function recommendPeopleAndBusinesses(questionContent, targetSegments = {}, currentUserId = null) {
  try {
    const qLower = (questionContent || '').toLowerCase();
    const cityLoc = (targetSegments.cityLocation || '').toLowerCase();
    const targetIndustries = (targetSegments.industries || []).map(i => i.toLowerCase());
    const targetInterests = (targetSegments.interests || []).map(i => i.toLowerCase());

    // Fetch users populated with user detail and city
    const allUsers = await User.find({ isActive: true })
      .populate({
        path: 'userDetailId',
        populate: { path: 'city', select: 'name' }
      })
      .lean();

    const peopleList = [];
    const businessList = [];

    for (const u of allUsers) {
      if (!u || !u.userDetailId) continue;
      const detail = u.userDetailId;
      // Skip asking user
      if (currentUserId && (String(u._id) === String(currentUserId) || String(detail._id) === String(currentUserId))) continue;

      const cityName = detail.city?.name || '';
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

    // Top People from real database profiles
    const realPeople = peopleList.slice(0, 3).map(item => {
      const u = item.user;
      const d = item.userDetail;
      const cityName = d.city?.name || '';
      return {
        user: u._id,
        fullName: d.fullName || 'Connect Member',
        position: d.position || d.industry || 'Professional',
        city: cityName ? (cityName.includes('India') ? cityName : `${cityName}, India`) : '',
        profileImage: d.profileImage || '',
        gender: d.gender || 'Other',
        dateOfBirth: d.dateOfBirth || null
      };
    });

    // Top Businesses from real database profiles
    const realBusinesses = businessList.slice(0, 3).map(item => {
      const u = item.user;
      const d = item.userDetail;
      const cityName = d.city?.name || '';
      return {
        user: u._id,
        businessName: d.businessName || 'Connect Business',
        businessCategory: d.businessTagline || d.industry || 'Verified Business Services',
        city: cityName ? (cityName.includes('India') ? cityName : `${cityName}, India`) : '',
        businessLogo: d.businessLogo || ''
      };
    });

    // Return top 3 matching people and businesses strictly from MongoDB database profiles
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
  generateAiAnswer,
  recommendPeopleAndBusinesses,
  rankProfilesByAiProfileMatch
};
