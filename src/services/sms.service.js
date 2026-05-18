const twilio = require('twilio');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER; // e.g. +1415XXXXXXX

// Ensure Indian numbers are in E.164 format (+91XXXXXXXXXX)
const formatPhone = (phoneNumber) => {
  if (!phoneNumber) return null;
  const digits = phoneNumber.toString().replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
};

const sendSms = (phoneNumber, text, templateId = null, variables = null) => {
  if (!phoneNumber || !ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) return;

  const payload = {
    from: FROM_NUMBER,
    to: formatPhone(phoneNumber)
  };

  // If templateId starts with HX, use Twilio Content API
  if (templateId && templateId.startsWith('HX')) {
    payload.contentSid = templateId;
    if (variables) {
      payload.contentVariables = JSON.stringify(variables);
    }
  } else {
    payload.body = text;
  }

  // Wrap in a never-rejecting Promise so errors can never propagate to callers
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 10000); // safety bail-out after 10 s

    twilio(ACCOUNT_SID, AUTH_TOKEN)
      .messages.create(payload)
      .then(() => { clearTimeout(timer); resolve(); })
      .catch((err) => {
        clearTimeout(timer);
        console.error(`[SMS] Failed to send to ${formatPhone(phoneNumber)}:`, err.message);
        resolve();
      });
  });
};

// ─── Registration Welcome ─────────────────────────────────────────────────────

const sendRegistrationSms = async (phoneNumber, fullName) => {
  const text = `Welcome to Connect India, ${fullName}! Your profile is now live. Start connecting at conect.in - Connect India Team`;
  await sendSms(phoneNumber, text);
};

// ─── Connection Request ───────────────────────────────────────────────────────

const sendConnectionRequestSms = async (phoneNumber, receiverName, senderName) => {
  const text = `Hi ${receiverName}, ${senderName} sent you a connection request on Connect India. Login to respond: conect.in - Connect India Team`;
  await sendSms(phoneNumber, text);
};

// ─── Connection Accepted ──────────────────────────────────────────────────────

const sendConnectionAcceptedSms = async (phoneNumber, senderName, accepterName) => {
  const text = `Hi ${senderName}, ${accepterName} accepted your connection request on Connect India. Start chatting: conect.in - Connect India Team`;
  await sendSms(phoneNumber, text);
};

// ─── Bulk SMS ──────────────────────────────────────────────────────────────────
/**
 * Send SMS to multiple recipients
 * @param {Array} recipients - Array of { phoneNumber, fullName }
 * @param {string} message - The message template or text
 * @param {string} templateId - Optional DLT template ID
 */
const sendBulkSms = async (recipients, message, templateId = null) => {
  if (!recipients || !Array.isArray(recipients)) return { sent: 0, failed: 0 };
  if (!message && !templateId) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      // Replace placeholder if exists for plain text fallback
      const personalizedMsg = message ? message.replace(/{{name}}/g, recipient.fullName || 'User') : '';
      
      // If using Twilio Content Editor (HX ID), pass the name as variable {{1}}
      const variables = (templateId && templateId.startsWith('HX')) 
        ? { "1": recipient.fullName || 'User' } 
        : null;

      await sendSms(recipient.phoneNumber, personalizedMsg, templateId, variables);
      sent++;
    } catch (err) {
      console.error(`[SMS] Bulk send failed for ${recipient.phoneNumber}:`, err.message);
      failed++;
    }
  }

  return { sent, failed };
};

module.exports = {
  sendRegistrationSms,
  sendConnectionRequestSms,
  sendConnectionAcceptedSms,
  sendBulkSms,
};
