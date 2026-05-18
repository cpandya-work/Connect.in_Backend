const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const User = require('./src/models/User.model');
const UserDetail = require('./src/models/UserDetail.model');

connectDB();

const seedAdmin = async () => {
  try {
    // Admin credentials (you can change these)
    const adminEmail = 'admin@connect.in';
    const adminPassword = 'admin123';
    const adminPhone = '+919999999999'; // Use a unique phone number that won't conflict

    // Check if admin already exists by email
    const existingAdminDetail = await UserDetail.findOne({ email: adminEmail });
    if (existingAdminDetail) {
      const existingUser = await User.findOne({ userDetailId: existingAdminDetail._id });
      if (existingUser && existingUser.role === 'admin') {
        console.log('✅ Admin user already exists!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin Login Credentials:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`Phone: ${existingUser.phoneNumber}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
      }
    }

    // Check if phone number already exists
    let existingUserByPhone = await User.findOne({ phoneNumber: adminPhone });
    
    if (existingUserByPhone) {
      // If user exists with this phone but is not admin, update it to admin
      if (existingUserByPhone.role !== 'admin') {
        // Check if userDetail exists
        if (existingUserByPhone.userDetailId) {
          const existingDetail = await UserDetail.findById(existingUserByPhone.userDetailId);
          if (existingDetail && existingDetail.email === adminEmail) {
            // Update existing user to admin
            existingUserByPhone.role = 'admin';
            await existingUserByPhone.save();
            console.log('✅ Updated existing user to admin role!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Admin Login Credentials:');
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${adminPassword}`);
            console.log(`Phone: ${adminPhone}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            process.exit(0);
          } else {
            // Phone exists but email doesn't match, delete and recreate
            await User.deleteOne({ _id: existingUserByPhone._id });
            if (existingUserByPhone.userDetailId) {
              await UserDetail.deleteOne({ _id: existingUserByPhone.userDetailId });
            }
          }
        } else {
          // User exists but no userDetail, delete and recreate
          await User.deleteOne({ _id: existingUserByPhone._id });
        }
      }
    }

    // Delete existing admin detail if exists (to recreate with new password)
    if (existingAdminDetail) {
      const existingUser = await User.findOne({ userDetailId: existingAdminDetail._id });
      if (existingUser) {
        await User.deleteOne({ _id: existingUser._id });
      }
      await UserDetail.deleteOne({ _id: existingAdminDetail._id });
      console.log('Removed existing admin user');
    }

    // Create admin user detail
    const adminDetail = await UserDetail.create({
      fullName: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      city: 'Surat',
      religion: 'Hindu',
      status: 'Unmarried',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      preferredLanguage: 'Hindi',
      habits: [],
      interests: [],
      skills: [],
    });

    // Create admin user with admin role
    const adminUser = await User.create({
      phoneNumber: adminPhone,
      userDetailId: adminDetail._id,
      role: 'admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Phone: ${adminPhone}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('You can now login with email/password to access admin APIs');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
