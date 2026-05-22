/**
 * Seed Admin User Script
 * Run: node src/seedAdmin.js
 *
 * Creates or updates the admin account:
 *   Email:    bhuvibhuvanesh101@gmail.com
 *   Password: @Bhuvanesh123
 *   Role:     admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const ADMIN = {
  name:     'Bhuvanesh (Admin)',
  email:    'bhuvibhuvanesh101@gmail.com',
  phone:    '0000000000',        // placeholder – change if needed
  password: '@Bhuvanesh123',
  role:     'admin',
  isVerified: true,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });

    if (existing) {
      // Update existing user to admin role + new password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(ADMIN.password, salt);

      await User.findByIdAndUpdate(existing._id, {
        role:       'admin',
        isVerified: true,
        password:   hashed,
        name:       ADMIN.name,
      });
      console.log('✅ Existing user updated to admin role');
    } else {
      // Create brand-new admin user
      // NOTE: pre-save hook in User model will hash the password automatically
      await User.create(ADMIN);
      console.log('✅ New admin user created');
    }

    console.log(`\n🎉 Admin Account Ready`);
    console.log(`   Email   : ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log(`   Role    : admin\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
