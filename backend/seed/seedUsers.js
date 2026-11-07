const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

const demoUsers = [
  {
    name: 'Chief AI Safety Officer',
    email: 'admin@controltower.io',
    password: 'Admin123!',
    role: 'Admin',
    department: 'Governance & Security',
    source: 'simulated'
  },
  {
    name: 'Lead Agent Operator',
    email: 'operator@controltower.io',
    password: 'Operator123!',
    role: 'Operator',
    department: 'AI Operations Center',
    source: 'simulated'
  },
  {
    name: 'Compliance Auditor',
    email: 'viewer@controltower.io',
    password: 'Viewer123!',
    role: 'Viewer',
    department: 'Risk & Audit',
    source: 'simulated'
  }
];

const seedUsers = async () => {
  try {
    await connectDB();

    console.log('[Seed] Upserting demo users...');
    for (const userData of demoUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        existing.name = userData.name;
        existing.role = userData.role;
        existing.department = userData.department;
        existing.password = userData.password; // Will trigger pre-save bcrypt hash
        existing.source = 'simulated';
        await existing.save();
        console.log(`[Seed] Updated demo user: ${userData.email} (${userData.role})`);
      } else {
        await User.create(userData);
        console.log(`[Seed] Created demo user: ${userData.email} (${userData.role})`);
      }
    }

    console.log('[Seed] User seeding complete!');
  } catch (error) {
    console.error('[Seed Error] Failed to seed users:', error);
    throw error;
  }
};

if (require.main === module) {
  seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedUsers;
