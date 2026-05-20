// Load .env before any test runs so DATABASE_URL, REDIS_URL, etc. are available
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
