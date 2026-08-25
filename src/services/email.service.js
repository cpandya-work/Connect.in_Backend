const nodemailer = require('nodemailer');

// ─── Transporter ────────────────────────────────────────────────────────────

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const FROM = `"Connect India" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL || 'https://connect.in';
const IMAGE_BASE_URL = process.env.BACKEND_URL || 'https://api.conect.in';
const UNSUBSCRIBE_URL = 'https://base.connect.in/unsubscribe/index-org.php';

const makeAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  console.log("Url", IMAGE_BASE_URL)
  console.log("BAse url", cleanUrl)
  console.log("Main url", `${IMAGE_BASE_URL}${cleanUrl}`)
  return `${IMAGE_BASE_URL}${cleanUrl}`;
};

// ─── Core sender ─────────────────────────────────────────────────────────────

const sendEmail = async (to, subject, html) => {
  if (!to || !process.env.SMTP_HOST) return; // silently skip if no email or SMTP not configured
  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
  }
};

// ─── Base template wrapper ───────────────────────────────────────────────────

const baseTemplate = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect India</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#EC7523 0%,#d45a09 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Connect</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">India's Network for Real Connections</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fb;padding:20px 40px;border-top:1px solid #e9ecef;text-align:center;">
              <p style="margin:0 0 6px;color:#adb5bd;font-size:12px;">© ${new Date().getFullYear()} Connect India. All rights reserved.</p>
              <p style="margin:0;font-size:12px;color:#adb5bd;">
                To unsubscribe from promotional emails,
                <a href="${UNSUBSCRIBE_URL}" style="color:#EC7523;text-decoration:none;">click here</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Button helper ────────────────────────────────────────────────────────────

const ctaButton = (href, label) => `
<table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
  <tr>
    <td align="center" style="border-radius:10px;background:#EC7523;">
      <a href="${href}" target="_blank"
         style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;

// ─── 1. Registration / Welcome ───────────────────────────────────────────────

const sendRegistrationEmail = async (email, fullName) => {
  const subject = 'Welcome to Connect India! 🎉';
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Welcome, ${fullName}! 👋</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Your profile is live on <strong>Connect India</strong> — India's network for real professional connections.
      Start exploring profiles, send connection requests, and grow your network today.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;color:#081332;font-weight:600;font-size:14px;">Here's what you can do:</p>
          <ul style="margin:0;padding-left:18px;color:#6b7280;font-size:14px;line-height:2;">
            <li>Browse profiles near you</li>
            <li>Send and accept connection requests</li>
            <li>Like profiles you find interesting</li>
            <li>Chat with your connections</li>
            <li>Explore exclusive card offers</li>
          </ul>
        </td>
      </tr>
    </table>

    ${ctaButton(APP_URL, 'Explore Connect →')}
  `);
  await sendEmail(email, subject, html);
};

// ─── 2. Connection Request ───────────────────────────────────────────────────

const sendConnectionRequestEmail = async (receiverEmail, receiverName, senderName) => {
  const subject = `${senderName} sent you a connection request on Connect`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">New Connection Request 🤝</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${receiverName}</strong>,<br/>
      <strong>${senderName}</strong> has sent you a connection request on Connect India.
      Log in to review and respond to it.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:8px;">
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
            💡 Connecting with people in your city helps you build a genuine local network.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(`${APP_URL}/connections`, 'View Request →')}
  `);
  await sendEmail(receiverEmail, subject, html);
};

// ─── 3. Connection Accepted ──────────────────────────────────────────────────

const sendConnectionAcceptedEmail = async (senderEmail, senderName, accepterName) => {
  const subject = `${accepterName} accepted your connection request on Connect`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Connection Accepted! 🎉</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${senderName}</strong>,<br/>
      Great news! <strong>${accepterName}</strong> accepted your connection request.
      You can now chat with each other directly on Connect India.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:8px;">
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6;">
            💬 Start a conversation — a simple "Hi" goes a long way!
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(`${APP_URL}/chat`, 'Start Chatting →')}
  `);
  await sendEmail(senderEmail, subject, html);
};

// ─── 4. Incoming Like ────────────────────────────────────────────────────────

const sendIncomingLikeEmail = async (likedUserEmail, likedUserName, likerName) => {
  const subject = `${likerName} liked your profile on Connect`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Someone Liked You! 💖</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${likedUserName}</strong>,<br/>
      <strong>${likerName}</strong> liked your profile on Connect India.
      Check out their profile and send a connection request if you're interested!
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:12px;margin-bottom:8px;">
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0;color:#6b21a8;font-size:14px;line-height:1.6;">
            ✨ Profiles with a complete photo get 3× more likes and connections.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(`${APP_URL}/likes`, 'See Who Liked You →')}
  `);
  await sendEmail(likedUserEmail, subject, html);
};

// ─── 5. New Post Shared ──────────────────────────────────────────────────────

const sendNewPostEmail = async (receiverEmail, receiverName, posterName) => {
  const subject = `${posterName} shared a new post on Connect`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">New Post Shared! 📮</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${receiverName}</strong>,<br/>
      <strong>${posterName}</strong> has shared a new post on Connect India.
      Check it out in the Shared section to see what's new in your network.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;margin-bottom:8px;">
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0;color:#854d0e;font-size:14px;line-height:1.6;">
            📢 Engaging with posts helps you build stronger professional relationships.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(`${APP_URL}/share`, 'View Post →')}
  `);
  await sendEmail(receiverEmail, subject, html);
};

// ─── 5. Broadcast Offer ──────────────────────────────────────────────────────

const sendBroadcastOfferEmail = async (recipientEmails, offerTitle, offerDescription) => {
  if (!recipientEmails || recipientEmails.length === 0) return { sent: 0, skipped: 0 };

  const subject = offerTitle || 'Exclusive Offer for Connect Members';
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Exclusive Offer 🎁</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      We have a special offer just for Connect India members.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;color:#EC7523;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Offer Details</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">${offerDescription}</p>
        </td>
      </tr>
    </table>

    ${ctaButton(`${APP_URL}/offer`, 'View Offer →')}
  `);

  let sent = 0;
  let skipped = 0;

  // Send in batches of 50 to avoid overwhelming the SMTP server
  const BATCH_SIZE = 50;
  for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
    const batch = recipientEmails.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (email) => {
        if (!email) { skipped++; return; }
        try {
          await sendEmail(email, subject, html);
          sent++;
        } catch {
          skipped++;
        }
      })
    );
  }

  return { sent, skipped };
};

const sendBulkHtmlEmail = async (recipients, subject, htmlContent) => {
  if (!recipients || recipients.length === 0) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  // Send in batches of 50 to avoid overwhelming the SMTP server
  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (recipient) => {
        if (!recipient.email) { skipped++; return; }
        try {
          const personalizedHtml = htmlContent.replace(/{{name}}/g, recipient.fullName || 'User');
          await sendEmail(recipient.email, subject, personalizedHtml);
          sent++;
        } catch (err) {
          console.error(`[Email] Custom send failed for ${recipient.email}:`, err.message);
          skipped++;
        }
      })
    );
  }

  return { sent, skipped };
};

// ─── 6. Scheduled Mailers Templates ──────────────────────────────────────────

const renderIncompleteProfileEmailHtml = (fullName, customBodyTemplate) => {
  if (customBodyTemplate) {
    const resolvedBody = customBodyTemplate
      .replace(/{name}/g, fullName)
      .replace(/{fullName}/g, fullName);
    return baseTemplate(`
      ${resolvedBody}
      ${ctaButton(APP_URL, 'Complete Profile Now →')}
    `);
  }
  return baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Complete your profile, ${fullName}! 🚀</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      We noticed that your profile is incomplete. Completing your profile helps you gain 3x more professional visibility, connect with people in your industry, and get discovered by top companies.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;color:#081332;font-weight:600;font-size:14px;">Here is what's missing on your profile:</p>
          <ul style="margin:0;padding-left:18px;color:#6b7280;font-size:14px;line-height:2;">
            <li>Add a professional Profile Image</li>
            <li>Select your City & Industry</li>
            <li>Add your current Position & Company</li>
            <li>Specify your Hobbies, Interests, & Skills</li>
          </ul>
        </td>
      </tr>
    </table>
    ${ctaButton(APP_URL, 'Complete Profile Now →')}
  `);
};

const renderCityIndustrySnapshotEmailHtml = (fullName, matches, customBodyTemplate) => {
  let matchesHtml = '';
  if (matches && matches.length > 0) {
    matchesHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-collapse: collapse;">
        ${matches.map(match => `
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 12px 0; vertical-align: middle;">
              <div style="font-weight: 600; color: #081332; font-size: 15px;">${match.fullName}</div>
              <div style="color: #6b7280; font-size: 13px;">
                ${match.position ? match.position : ''} ${match.company ? `at ${match.company}` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </table>
    `;
  } else {
    matchesHtml = `
      <p style="color: #6b7280; font-style: italic; margin-bottom: 20px;">
        No new users joined in your city/industry this week. Invite colleagues to grow your local network!
      </p>
    `;
  }

  if (customBodyTemplate) {
    const resolvedBody = customBodyTemplate
      .replace(/{name}/g, fullName)
      .replace(/{fullName}/g, fullName)
      .replace(/{matches}/g, matchesHtml);
    return baseTemplate(`
      ${resolvedBody}
      ${ctaButton(APP_URL, 'Explore Network →')}
    `);
  }

  return baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Weekly Network Snapshot 🌐</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${fullName}</strong>,<br/>
      Here is a snapshot of recently registered users in your city and industry. Connect with them to expand your local professional network!
    </p>
    ${matchesHtml}
    ${ctaButton(APP_URL, 'Explore Network →')}
  `);
};

const renderOfferOfTheDayEmailHtml = (fullName, offer, customBodyTemplate) => {
  const featuresList = offer.features && offer.features.length > 0
    ? offer.features.map(f => `<li>${f}</li>`).join('')
    : '';

  const offerFeatures = featuresList ? `
    <p style="margin:0 0 8px;color:#081332;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Key Benefits:</p>
    <ul style="margin:0 0 16px;padding-left:18px;color:#6b7280;font-size:13px;line-height:1.8;">
      ${featuresList}
    </ul>
  ` : '';

  const logoUrl = makeAbsoluteUrl(offer.logo_image);
  const imageUrl = makeAbsoluteUrl(offer.offer_image);

  const offerLogo = offer.logo_image ? `
    <tr>
      <td align="center" style="padding: 24px 24px 0;">
        <img src="${logoUrl}" alt="${offer.name}" style="max-height: 80px; width: auto; border-radius: 8px;" />
      </td>
    </tr>
  ` : '';

  const offerImage = offer.offer_image ? `
    <tr>
      <td align="center" style="padding: 0 24px 20px;">
        <img src="${imageUrl}" alt="${offer.name}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 250px; object-fit: contain;" />
      </td>
    </tr>
  ` : '';

  const offerImageHtml = offer.offer_image ? `
    <div style="text-align:center; margin: 16px 0;">
      <img src="${imageUrl}" alt="${offer.name}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; display: inline-block;" />
    </div>
  ` : '';

  const offerImageUrl = imageUrl;

  if (customBodyTemplate) {
    let resolvedBody = customBodyTemplate;

    // Gracefully handle instances where administrators put {offerImage} or {offerLogo} inside an img tag's src attribute
    resolvedBody = resolvedBody
      .replace(/src=["']?\{offerImage\}["']?/gi, `src="${imageUrl}"`)
      .replace(/src=["']?\{offerLogo\}["']?/gi, `src="${logoUrl}"`);

    resolvedBody = resolvedBody
      .replace(/{name}/g, fullName)
      .replace(/{fullName}/g, fullName)
      .replace(/{offerName}/g, offer.name)
      .replace(/{offerDescription}/g, offer.description || '')
      .replace(/{offerLogo}/g, offerLogo)
      .replace(/{offerFeatures}/g, offerFeatures)
      .replace(/{offerImage}/g, offerImage)
      .replace(/{offerImageHtml}/g, offerImageHtml)
      .replace(/{offerImageUrl}/g, offerImageUrl)
      .replace(/{offer_image_url}/g, offerImageUrl)
      .replace(/{offerUrl}/g, offer.url || `${APP_URL}/offer`)
      .replace(/{offer_url}/g, offer.url || `${APP_URL}/offer`);

    return baseTemplate(`
      ${resolvedBody}
      ${ctaButton(offer.url || `${APP_URL}/offer`, 'Get This Offer →')}
    `);
  }

  return baseTemplate(`
    <h2 style="margin:0 0 8px;color:#081332;font-size:22px;font-weight:700;">Offer of the Day! 🎁</h2>
    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${fullName}</strong>,<br/>
      Here is today's exclusive offer handpicked for you on Connect India. Check it out and unlock great benefits today!
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;overflow:hidden;">
      ${offerLogo}
      ${offerImage}
      <tr>
        <td style="padding:20px 24px;">
          <h3 style="margin:0 0 8px;color:#081332;font-size:18px;font-weight:700;">${offer.name}</h3>
          <p style="margin:0 0 16px;color:#495057;font-size:14px;line-height:1.6;">${offer.description || ''}</p>
          
          ${featuresList ? `
          <p style="margin:0 0 8px;color:#081332;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Key Benefits:</p>
          <ul style="margin:0 0 16px;padding-left:18px;color:#6b7280;font-size:13px;line-height:1.8;">
            ${featuresList}
          </ul>
          ` : ''}
        </td>
      </tr>
    </table>

    ${ctaButton(offer.url || `${APP_URL}/offer`, 'Get This Offer →')}
  `);
};

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendIncomingLikeEmail,
  sendBroadcastOfferEmail,
  sendNewPostEmail,
  sendBulkHtmlEmail,
  renderIncompleteProfileEmailHtml,
  renderCityIndustrySnapshotEmailHtml,
  renderOfferOfTheDayEmailHtml,
};

