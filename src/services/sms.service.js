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

const sendSms = (phoneNumber, text) => {
  if (!phoneNumber || !ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) return;

  // Wrap in a never-rejecting Promise so errors can never propagate to callers
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 10000); // safety bail-out after 10 s

    twilio(ACCOUNT_SID, AUTH_TOKEN)
      .messages.create({ body: text, from: FROM_NUMBER, to: formatPhone(phoneNumber) })
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

module.exports = {
  sendRegistrationSms,
  sendConnectionRequestSms,
  sendConnectionAcceptedSms,
};
