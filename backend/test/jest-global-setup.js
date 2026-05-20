// Global setup: load .env before any test module is imported
// This runs in a separate Node process before Jest workers start
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = async () => {
  // Env vars are now set for the global setup process.
  // Jest workers inherit process.env from the parent, so DATABASE_URL etc. will be available.
};
