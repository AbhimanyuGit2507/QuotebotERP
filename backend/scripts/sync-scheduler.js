#!/usr/bin/env node
/**
 * Gmail Sync Scheduler
 * Runs the sync-gmail.js script on a schedule
 * 
 * Usage:
 *    node scripts/sync-scheduler.js
 * 
 * Or from manage-services.sh, it will start automatically with the backend
 */

const { spawn } = require('child_process');
const path = require('path');

const SYNC_INTERVAL = process.env.SYNC_INTERVAL_MINUTES ? 
  parseInt(process.env.SYNC_INTERVAL_MINUTES) * 60000 : 
  60000; // Default 1 minute

console.log(`⏰ Gmail Sync Scheduler started`);
console.log(`📍 Interval: ${SYNC_INTERVAL / 60000} minute(s)\n`);

let isRunning = false;
let lastSyncTime = null;

function runSync() {
  if (isRunning) {
    console.log('⏭️  Sync already in progress, skipping...');
    return;
  }

  isRunning = true;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Starting Gmail sync...`);

  const syncScript = path.join(__dirname, 'sync-gmail.js');
  const child = spawn('node', [syncScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  child.on('close', (code) => {
    lastSyncTime = new Date();
    isRunning = false;

    if (code === 0) {
      // Extract the final summary line
      const lines = stdout.split('\n').filter(l => l.trim());
      const summary = lines[lines.length - 2] || 'Completed';
      console.log(`✅ ${summary}`);
    } else {
      console.error(`❌ Sync failed with code ${code}`);
      if (stderr) console.error(`Error: ${stderr.substring(0, 200)}`);
    }
    console.log();
  });

  child.on('error', (err) => {
    isRunning = false;
    console.error(`❌ Failed to start sync: ${err.message}\n`);
  });
}

// Run immediately on startup
runSync();

// Schedule periodic runs
setInterval(() => {
  runSync();
}, SYNC_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  Scheduler received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Scheduler received SIGINT, shutting down...');
  process.exit(0);
});
