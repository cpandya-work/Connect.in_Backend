const cron = require('node-cron');
const {
  scheduleIncompleteProfiles,
  scheduleCityIndustrySnapshots,
  scheduleOfferOfTheDay,
  processMailQueue,
} = require('../services/scheduler.service');

// Initialize Cron Jobs
const initCronJobs = () => {
  console.log('[Cron] Initializing scheduled mailer cron jobs...');

  // 1. Weekly Scheduler (runs every Sunday at 9:00 PM)
  /*
  cron.schedule('0 21 * * 0', async () => {
    try {
      console.log('[Cron] Starting weekly cron tasks (Incomplete Profiles & Snapshots)...');
      await scheduleIncompleteProfiles();
      await scheduleCityIndustrySnapshots();
      console.log('[Cron] Weekly cron tasks completed successfully.');
    } catch (err) {
      console.error('[Cron] Error running weekly cron tasks:', err);
    }
  });
  */

  // 2. Daily Scheduler (runs every day at 9:00 PM)
  /*
  cron.schedule('0 21 * * *', async () => {
    try {
      console.log('[Cron] Starting daily cron tasks (Offer of the Day)...');
      await scheduleOfferOfTheDay();
      console.log('[Cron] Daily cron tasks completed successfully.');
    } catch (err) {
      console.error('[Cron] Error running daily cron tasks:', err);
    }
  });
  */

  // 3. Hourly Processor (runs at the top of every hour: 0 * * * *)
  /*
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cron] Starting hourly mail queue processor...');
      await processMailQueue();
      console.log('[Cron] Hourly mail queue processor finished.');
    } catch (err) {
      console.error('[Cron] Error running hourly mail queue processor:', err);
    }
  });
  */

  console.log('[Cron] Scheduled mailer cron jobs are currently disabled.');
};

module.exports = {
  initCronJobs,
};
