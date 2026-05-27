const axios = require('axios');

// Helper to format/clean phone numbers for mytoday Bulk SMS API (e.g. stripping leading '+')
const formatPhoneForMytoday = (phoneNumber) => {
  if (!phoneNumber) return '';
  return phoneNumber.toString().replace(/^\+/, '');
};

// ─── Registration Welcome ─────────────────────────────────────────────────────

const sendRegistrationSms = async (phoneNumber, fullName) => {
  try {
    const cleanPhone = formatPhoneForMytoday(phoneNumber);
    if (!cleanPhone) return;

    const text = `Hi ${fullName} \r\n\r\nYour profile is now live - start connecting, exploring opportunities, and showcasing your skills today.\r\n\r\nhttps://www.connect.in\r\n\r\n- Team Connect.in`;
    const encText = encodeURIComponent(text);

    const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=${encText}&templateid=1207177869921422898&entityid=1201160765852941646&senderid=CONCTN`;

    console.log(`[SMS] Sending Registration SMS to ${cleanPhone}`);
    await axios.get(url);
  } catch (err) {
    console.error(`[SMS] Failed to send Registration SMS to ${phoneNumber}:`, err.message);
  }
};

// ─── Connection Request ───────────────────────────────────────────────────────

const sendConnectionRequestSms = async (phoneNumber, receiverName, senderName) => {
  try {
    const cleanPhone = formatPhoneForMytoday(phoneNumber);
    if (!cleanPhone) return;

    const encReceiverName = encodeURIComponent(receiverName);
    const encSenderName = encodeURIComponent(senderName);

    const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=Dear%20${encReceiverName}%20You%20have%20received%20a%20Connection%20Request%20from%20${encSenderName}.%20To%20stay%20connected%20click%20here%20https://www.connect.in.-%20Team%20Connect.in&templateid=1207164380651856408&entityid=1201160765852941646&senderid=CONCTN`;

    console.log(`[SMS] Sending Connection Request SMS tossss ${cleanPhone}`);
    await axios.get(url);
  } catch (err) {
    console.error(`[SMS] Failed to send Connection Request SMS to ${phoneNumber}:`, err.message);
  }
};

// ─── Connection Accepted ──────────────────────────────────────────────────────

const sendConnectionAcceptedSms = async (phoneNumber, senderName, accepterName) => {
  try {
    const cleanPhone = formatPhoneForMytoday(phoneNumber);
    if (!cleanPhone) return;

    const encSenderName = encodeURIComponent(senderName);
    const encAccepterName = encodeURIComponent(accepterName);

    const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=Dear%20${encSenderName}%0A${encAccepterName}%20has%20accepted%20your%20connection%20request.%20To%20stay%20connected%20click%20here%20https://www.connect.in.%20Team%20Connect.in&templateid=1207163471957799962&entityid=1201160765852941646&senderid=CONCTN`;

    console.log(`[SMS] Sending Connection Acceptance SMS to ${cleanPhone}`);
    await axios.get(url);
  } catch (err) {
    console.error(`[SMS] Failed to send Connection Acceptance SMS to ${phoneNumber}:`, err.message);
  }
};

// ─── Profile Liked ────────────────────────────────────────────────────────────

const sendProfileLikedSms = async (phoneNumber, receiverName, likerName) => {
  try {
    const cleanPhone = formatPhoneForMytoday(phoneNumber);
    console.log("Cleanphone", cleanPhone)
    if (!cleanPhone) return;

    const text = `Dear ${receiverName} Great news! ${likerName} just liked your profile on Connect.in. Check it out and start a conversation now! https://www.connect.in Team Connect.in`;
    const encText = encodeURIComponent(text);

    const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=${encText}&templateid=1207177869522536093&entityid=1201160765852941646&senderid=CONCTN`;

    console.log(`[SMS] Sending Profile Liked SMS to ${cleanPhone}`);
    await axios.get(url);
  } catch (err) {
    console.error(`[SMS] Failed to send Profile Liked SMS to ${phoneNumber}:`, err.message);
  }
};

// ─── Incomplete Profile Bulk SMS ──────────────────────────────────────────────
// Uses the direct MyToday BulkSMS URL with pre-approved template ID 1207177849537448569
const sendIncompleteProfileBulkSms = async (users) => {
  console.log(`[SMS] Initiating bulk SMS for ${users.length} incomplete profile users`);
  let sentCount = 0;
  let errorCount = 0;
  
  for (const user of users) {
    try {
      const cleanPhone = formatPhoneForMytoday(user.phoneNumber);
      if (!cleanPhone) continue;
      
      const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=Hi!%20%0D%0A%0D%0AYou%20signed%20up%20to%20connect%20with%20professionals%20at%20TCS.%20Complete%20your%20profile%20to%20unlock%20networking%20opportunities%20https://www.connect.in/%20-%20Team%20Connect.in%0D%0A%0D%0A-%20Team%20Connect.in&templateid=1207177849537448569&entityid=1201160765852941646&senderid=CONCTN`;
      
      console.log(`[SMS] Sending Bulk SMS to ${cleanPhone} using template 1207177849537448569`);
      await axios.get(url);
      sentCount++;
    } catch (err) {
      console.error(`[SMS] Failed to send bulk SMS to ${user.phoneNumber}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`[SMS] Bulk SMS completed. Sent: ${sentCount}, Errors: ${errorCount}`);
  return { sent: sentCount, errors: errorCount };
};

// ─── General Bulk SMS Broadcast ──────────────────────────────────────────────
const sendBulkSms = async (users, message, templateId, entityId) => {
  console.log(`[SMS] Initiating general bulk SMS for ${users.length} users`);
  let sentCount = 0;
  let errorCount = 0;
  
  // Use a default entity ID if none provided
  const targetEntityId = entityId || '1201160765852941646';
  
  for (const user of users) {
    try {
      const cleanPhone = formatPhoneForMytoday(user.phoneNumber);
      if (!cleanPhone) continue;
      
      // Personalize message if {{name}} is present
      const personalizedMessage = message.replace(/\{\{\s*name\s*\}\}/gi, user.fullName || 'User');
      const encText = encodeURIComponent(personalizedMessage);
      
      const url = `https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${cleanPhone}&Text=${encText}&templateid=${templateId}&entityid=${targetEntityId}&senderid=CONCTN`;
      
      console.log(`[SMS] Sending Bulk SMS to ${cleanPhone} using template ${templateId}`);
      await axios.get(url);
      sentCount++;
    } catch (err) {
      console.error(`[SMS] Failed to send general bulk SMS to ${user.phoneNumber}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`[SMS] General Bulk SMS completed. Sent: ${sentCount}, Errors: ${errorCount}`);
  return { sent: sentCount, errors: errorCount };
};

module.exports = {
  sendRegistrationSms,
  sendConnectionRequestSms,
  sendConnectionAcceptedSms,
  sendProfileLikedSms,
  sendIncompleteProfileBulkSms,
  sendBulkSms,
};
