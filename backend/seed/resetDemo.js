const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const seedUsers = require('./seedUsers');
const seedAgentsAndTraces = require('./seedAgentsAndTraces');
const seedPhase3Governance = require('./seedPhase3Governance');
const seedPhase4Audit = require('./seedPhase4Audit');

const resetDemo = async () => {
  try {
    await connectDB();
    console.log('[Reset] Resetting demo state...');
    // Seed users
    await seedUsers();
    // Seed agents and traces
    await seedAgentsAndTraces();
    // Seed phase 3 governance
    await seedPhase3Governance();
    // Seed phase 4 audit & integrations
    await seedPhase4Audit();
    console.log('[Reset] Reset completed successfully.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  } catch (err) {
    console.error('[Reset Error]:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  resetDemo();
}

module.exports = resetDemo;
