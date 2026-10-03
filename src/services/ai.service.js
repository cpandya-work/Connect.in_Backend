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
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI assistant for Connect.in, a professional and community network in India. Provide concise, well-structured, practical advice for questions. Format your answer with clear numbered key points.'
            },
            {
              role: 'user',
              content: `Question: "${questionContent}". Provide a structured, helpful answer with key aspects to consider.`
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const text = response.data.choices[0].message.content;
        return {
          content: text,
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

    // Fetch user details populated with user reference and city
    const allUserDetails = await UserDetail.find()
      .populate({ path: 'city', select: 'name' })
      .lean();

    const peopleList = [];
    const businessList = [];

    for (const detail of allUserDetails) {
      if (!detail) continue;
      // Skip asking user
      if (currentUserId && String(detail._id) === String(currentUserId)) continue;

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
          userDetail: detail,
          score: score + (detail.businessApprovalStatus === 'approved' ? 5 : 0)
        });
      } else {
        peopleList.push({
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
      const d = item.userDetail;
      const cityName = d.city?.name || '';
      return {
        user: d._id,
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
      const d = item.userDetail;
      const cityName = d.city?.name || '';
      return {
        user: d._id,
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

module.exports = {
  generateAiAnswer,
  recommendPeopleAndBusinesses
};
