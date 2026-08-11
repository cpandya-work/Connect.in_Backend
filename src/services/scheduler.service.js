const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Card = require('../models/Card.model');
const MailQueue = require('../models/MailQueue.model');
const Setting = require('../models/Setting.model');
const {
  sendEmail,
  renderIncompleteProfileEmailHtml,
  renderCityIndustrySnapshotEmailHtml,
  renderOfferOfTheDayEmailHtml,
} = require('./email.service');


const getFutureDate = (daysToAdd, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const getMailerSetting = async (type) => {
  try {
    const setting = await Setting.findOne({ key: 'scheduled_mailers_settings' });
    const defaultSettings = {
      INCOMPLETE_PROFILE: {
        isEnabled: true,
        subject: 'Action Required: Complete your Connect India profile! 🚀'
      },
      CITY_INDUSTRY_SNAPSHOT: {
        isEnabled: true,
        subject: 'Weekly Network Snapshot: New Matches in your City & Industry 🌐'
      },
      OFFER_OF_THE_DAY: {
        isEnabled: true,
        subject: 'Offer of the Day: {offerName} 🎁'
      }
    };
    if (!setting || !setting.value || !setting.value[type]) {
      return defaultSettings[type];
    }
    return {
      ...defaultSettings[type],
      ...setting.value[type]
    };
  } catch (err) {
    console.error(`Error fetching setting for ${type}:`, err);
    return { isEnabled: true }; // default fallback
  }
};

/**
 * Scheduler Service
 */

/**
 * 1. Incomplete Profiles Mailer Generator
 * Runs weekly. Finds users with incomplete profiles, divides them by 7,
 * and schedules them to send throughout the coming week.
 */
const scheduleIncompleteProfiles = async () => {
  try {
    console.log('[Scheduler] Generating Incomplete Profile mailers...');

    const setting = await getMailerSetting('INCOMPLETE_PROFILE');
    if (!setting.isEnabled) {
      console.log('[Scheduler] Incomplete Profile mailers are disabled in settings. Skipping.');
      return { scheduled: 0 };
    }
    const customSubject = setting.subject || 'Action Required: Complete your Connect India profile! 🚀';
    
    // Find all incomplete user details with valid emails
    const incompleteDetails = await UserDetail.find({
      $or: [
        { profileImage: { $exists: false } },
        { profileImage: '' },
        { profileImage: null },
        { isProfileComplete: false }
      ],
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('_id email fullName').lean();

    const total = incompleteDetails.length;
    console.log(`[Scheduler] Found ${total} users with incomplete profiles & emails.`);
    if (total === 0) return { scheduled: 0 };

    const chunkSize = Math.ceil(total / 7);
    let queuedCount = 0;

    for (let day = 0; day < 7; day++) {
      const startIdx = day * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, total);
      const chunk = incompleteDetails.slice(startIdx, endIdx);
      const scheduledFor = getFutureDate(day, 9); // Schedule for 09:00 AM on subsequent days

      const bulkOps = chunk.map(user => ({
        recipient: user.email,
        recipientName: user.fullName || 'User',
        subject: customSubject,
        html: renderIncompleteProfileEmailHtml(user.fullName || 'User'),
        type: 'INCOMPLETE_PROFILE',
        scheduledFor,
        status: 'pending'
      }));

      if (bulkOps.length > 0) {
        await MailQueue.insertMany(bulkOps);
        queuedCount += bulkOps.length;
      }
    }

    console.log(`[Scheduler] Scheduled ${queuedCount} Incomplete Profile emails.`);
    return { scheduled: queuedCount };
  } catch (err) {
    console.error('[Scheduler] Error scheduling incomplete profiles:', err);
    throw err;
  }
};

/**
 * 2. Same City & Same Industry Snapshot Mailer Generator
 * Runs weekly. Finds active users with completed profile (has city & industry),
 * divides them by 7, and queues a snapshot of matching users registered recently.
 */
const scheduleCityIndustrySnapshots = async () => {
  try {
    console.log('[Scheduler] Generating City & Industry Snapshot mailers...');

    const setting = await getMailerSetting('CITY_INDUSTRY_SNAPSHOT');
    if (!setting.isEnabled) {
      console.log('[Scheduler] City & Industry Snapshot mailers are disabled in settings. Skipping.');
      return { scheduled: 0 };
    }
    const customSubject = setting.subject || 'Weekly Network Snapshot: New Matches in your City & Industry 🌐';

    // Fetch active users with completed city/industry fields & valid email
    const targetUsers = await UserDetail.find({
      email: { $exists: true, $ne: null, $ne: '' },
      city: { $exists: true, $ne: null },
      industry: { $exists: true, $ne: null, $ne: '' }
    }).select('_id email fullName city industry').lean();

    const total = targetUsers.length;
    console.log(`[Scheduler] Found ${total} target users for Snapshot mailer.`);
    if (total === 0) return { scheduled: 0 };

    const chunkSize = Math.ceil(total / 7);
    let queuedCount = 0;

    for (let day = 0; day < 7; day++) {
      const startIdx = day * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, total);
      const chunk = targetUsers.slice(startIdx, endIdx);
      const scheduledFor = getFutureDate(day, 10); // Schedule for 10:00 AM on subsequent days

      const bulkOps = [];

      for (const user of chunk) {
        // Find last 50 users registered in the same city and same industry
        const matches = await UserDetail.find({
          city: user.city,
          industry: user.industry,
          _id: { $ne: user._id }
        })
        .sort({ _id: -1 })
        .limit(50)
        .select('fullName position company')
        .lean();

        // Only generate email queue if matches exist to provide a meaningful network value
        if (matches && matches.length > 0) {
          bulkOps.push({
            recipient: user.email,
            recipientName: user.fullName || 'User',
            subject: customSubject,
            html: renderCityIndustrySnapshotEmailHtml(user.fullName || 'User', matches),
            type: 'CITY_INDUSTRY_SNAPSHOT',
            scheduledFor,
            status: 'pending'
          });
        }
      }

      if (bulkOps.length > 0) {
        await MailQueue.insertMany(bulkOps);
        queuedCount += bulkOps.length;
      }
    }

    console.log(`[Scheduler] Scheduled ${queuedCount} Network Snapshot emails.`);
    return { scheduled: queuedCount };
  } catch (err) {
    console.error('[Scheduler] Error scheduling network snapshots:', err);
    throw err;
  }
};

/**
 * 3. Offer of the Day Mailer Generator
 * Runs daily. Selects the last 5,000 active users and queues the designated
 * offer of the day, distributing them evenly across 24 hours.
 */
const scheduleOfferOfTheDay = async () => {
  try {
    console.log('[Scheduler] Generating Offer of the Day mailers...');

    const setting = await getMailerSetting('OFFER_OF_THE_DAY');
    if (!setting.isEnabled) {
      console.log('[Scheduler] Offer of the Day mailers are disabled in settings. Skipping.');
      return { scheduled: 0 };
    }

    // Get an active offer card
    const activeCards = await Card.find({ isActive: true }).lean();
    if (activeCards.length === 0) {
      console.log('[Scheduler] No active cards/offers found. Skipping Offer of the Day.');
      return { scheduled: 0 };
    }
    // Select one active card randomly as the offer of the day
    const offer = activeCards[Math.floor(Math.random() * activeCards.length)];

    // Fetch the last 5000 registered users who are active
    const users = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate('userDetailId', 'email fullName')
      .lean();

    const targetUsers = users
      .map(u => u.userDetailId)
      .filter(ud => ud && ud.email);

    const total = targetUsers.length;
    console.log(`[Scheduler] Found ${total} active users with emails out of last 5000.`);
    if (total === 0) return { scheduled: 0 };

    const chunkSize = Math.ceil(total / 24); // 24 hourly chunks
    let queuedCount = 0;

    for (let hour = 0; hour < 24; hour++) {
      const startIdx = hour * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, total);
      const chunk = targetUsers.slice(startIdx, endIdx);
      
      const scheduledFor = new Date();
      scheduledFor.setHours(scheduledFor.getHours() + hour);

      const customSubjectTemplate = setting.subject || 'Offer of the Day: {offerName} 🎁';
      const customSubject = customSubjectTemplate.replace(/{offerName}/g, offer.name).replace(/{name}/g, offer.name);

      const bulkOps = chunk.map(user => ({
        recipient: user.email,
        recipientName: user.fullName || 'User',
        subject: customSubject,
        html: renderOfferOfTheDayEmailHtml(user.fullName || 'User', offer),
        type: 'OFFER_OF_THE_DAY',
        scheduledFor,
        status: 'pending'
      }));

      if (bulkOps.length > 0) {
        await MailQueue.insertMany(bulkOps);
        queuedCount += bulkOps.length;
      }
    }

    console.log(`[Scheduler] Scheduled ${queuedCount} Offer of the Day emails across 24 hours.`);
    return { scheduled: queuedCount };
  } catch (err) {
    console.error('[Scheduler] Error scheduling offer of the day:', err);
    throw err;
  }
};

/**
 * 4. Mail Queue Processor
 * Runs hourly. Fetches all pending emails whose scheduled time has passed
 * and sends them out in small concurrent batches.
 */
const processMailQueue = async () => {
  try {
    const now = new Date();
    // Fetch pending mails that are due (limit to 500 per hourly run to be safe)
    const pendingMails = await MailQueue.find({
      status: 'pending',
      scheduledFor: { $lte: now }
    }).limit(500);

    const total = pendingMails.length;
    if (total === 0) {
      return { sent: 0, skipped: 0, failed: 0 };
    }

    console.log(`[Scheduler] Processing ${total} pending emails in queue...`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = pendingMails.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (mail) => {
        // Dynamic skip check for incomplete profiles:
        // If they completed their profile since it was queued, we don't send the email
        if (mail.type === 'INCOMPLETE_PROFILE') {
          const userDetail = await UserDetail.findOne({ email: mail.recipient }).select('isProfileComplete profileImage');
          if (userDetail && userDetail.isProfileComplete && userDetail.profileImage) {
            mail.status = 'sent';
            mail.sentAt = new Date();
            mail.errorMessage = 'Skipped: Profile completed in the meantime';
            await mail.save();
            skipped++;
            return;
          }
        }

        try {
          mail.attempts += 1;
          await sendEmail(mail.recipient, mail.subject, mail.html);
          
          mail.status = 'sent';
          mail.sentAt = new Date();
          mail.errorMessage = null;
          sent++;
        } catch (err) {
          console.error(`[Scheduler] Failed to send to ${mail.recipient}:`, err.message);
          mail.status = mail.attempts >= 3 ? 'failed' : 'pending';
          mail.errorMessage = err.message || 'SMTP Error';
          failed++;
        }
        
        await mail.save();
      }));
    }

    console.log(`[Scheduler] Queue processing completed: Sent ${sent}, Skipped ${skipped}, Failed ${failed}`);
    return { sent, skipped, failed };
  } catch (err) {
    console.error('[Scheduler] Error processing mail queue:', err);
    throw err;
  }
};

module.exports = {
  scheduleIncompleteProfiles,
  scheduleCityIndustrySnapshots,
  scheduleOfferOfTheDay,
  processMailQueue,
};
