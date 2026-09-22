require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const UserDetail = require('../src/models/UserDetail.model');

const run = async () => {
  try {
    await connectDB();
    console.log('[Migration] Starting email verification status sync from connect-bounces.csv...');

    const csvPath = path.join(__dirname, '../connect-bounces.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`[Migration] Error: File not found at ${csvPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const bouncedEmails = Array.from(
      new Set(
        content
          .split(/\r?\n/)
          .map(line => line.trim().toLowerCase())
          .filter(email => email.length > 0 && email.includes('@'))
      )
    );

    console.log(`[Migration] Found ${bouncedEmails.length} unique bounced email addresses in CSV.`);

    // 1. Set isEmailVerified = false for all bounced email addresses
    const bouncedResult = await UserDetail.updateMany(
      { email: { $in: bouncedEmails } },
      { $set: { isEmailVerified: false } }
    );
    console.log(`[Migration] Updated ${bouncedResult.modifiedCount} bounced user profiles -> isEmailVerified: false`);

    // 2. Set isEmailVerified = true for all other existing non-bounced email addresses
    const validResult = await UserDetail.updateMany(
      { 
        email: { $exists: true, $ne: null, $ne: '' },
        email: { $nin: bouncedEmails }
      },
      { $set: { isEmailVerified: true } }
    );
    console.log(`[Migration] Updated ${validResult.modifiedCount} valid user profiles -> isEmailVerified: true`);

    console.log('[Migration] Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Migration error:', err);
    process.exit(1);
  }
};

run();
