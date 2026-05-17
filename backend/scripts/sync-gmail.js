#!/usr/bin/env node
/**
 * Manual Gmail Sync Script
 * Syncs Gmail emails directly to backend via internal API
 * 
 * Usage:
 *   node scripts/sync-gmail.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const defaultDaysBack = Number.parseInt(process.env.GMAIL_SYNC_DAYS_BACK || '30', 10);
const defaultMaxPerDay = Number.parseInt(process.env.GMAIL_SYNC_MAX_MESSAGES_PER_DAY || '1000', 10);
const computedDefaultMax =
  Math.max(1, Number.isFinite(defaultDaysBack) ? defaultDaysBack : 7) *
  Math.max(1, Number.isFinite(defaultMaxPerDay) ? defaultMaxPerDay : 1000);

const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
  internalKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
  tenantId: process.env.SYNC_TENANT_ID || 'cmmvzc6z60003bze8i4uhs03l',
  daysBack: defaultDaysBack,
  maxMessagesPerDay: defaultMaxPerDay,
  maxMessagesPerAccount: Number.parseInt(
    process.env.GMAIL_SYNC_MAX_MESSAGES || String(computedDefaultMax),
    10,
  ),
  statusFile:
    process.env.GMAIL_SYNC_STATUS_FILE ||
    path.join(__dirname, '..', '.runlogs', 'gmail-sync-status.json'),
};

const syncStatus = {
  status: 'idle',
  tenantId: config.tenantId,
  startedAt: null,
  endedAt: null,
  lastRunAt: null,
  accountsTotal: 0,
  accountsProcessed: 0,
  totalMessages: 0,
  processedMessages: 0,
  synced: 0,
  duplicates: 0,
  failed: 0,
  currentAccountId: null,
  error: null,
  user_error: null,
  technical_error: null,
};

function resolveUserError(message) {
  const normalized = (message || '').toLowerCase();
  if (
    normalized.includes('refresh') ||
    normalized.includes('invalid_grant') ||
    normalized.includes('token') ||
    normalized.includes('401')
  ) {
    return 'Gmail authorization expired. Please reconnect Gmail in System Config.';
  }

  return 'Email sync failed. Please try again or contact support.';
}

function writeSyncStatus() {
  try {
    fs.mkdirSync(path.dirname(config.statusFile), { recursive: true });
    fs.writeFileSync(config.statusFile, `${JSON.stringify(syncStatus, null, 2)}\n`, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to write sync status: ${message}`);
  }
}

function setSyncStatus(partial) {
  Object.assign(syncStatus, partial);
  writeSyncStatus();
}

async function fetchRecentMessageRefs(accessToken) {
  const safeDaysBack = Number.isFinite(config.daysBack) && config.daysBack > 0
    ? config.daysBack
    : 5;
  const collected = [];
  let pageToken = null;

  while (collected.length < config.maxMessagesPerAccount) {
    const params = new URLSearchParams({
      labelIds: 'INBOX',
      maxResults: '100',
      q: `newer_than:${safeDaysBack}d`,
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const messagesRes = await httpRequest({
      url: `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (messagesRes.status !== 200) {
      return {
        ok: false,
        status: messagesRes.status,
        messages: [],
      };
    }

    const pageMessages = Array.isArray(messagesRes.data.messages) ? messagesRes.data.messages : [];
    collected.push(...pageMessages);

    pageToken = messagesRes.data.nextPageToken || null;
    if (!pageToken || pageMessages.length === 0) {
      break;
    }
  }

  return {
    ok: true,
    status: 200,
    messages: collected.slice(0, config.maxMessagesPerAccount),
  };
}

function decodeBase64Url(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;

  try {
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function collectMimeParts(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const queue = [payload];
  const parts = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    parts.push(current);

    const childParts = current.parts;
    if (Array.isArray(childParts)) {
      for (const part of childParts) {
        queue.push(part);
      }
    }
  }

  return parts;
}

function extractMessageBodies(fullMessage) {
  const payload = fullMessage && typeof fullMessage === 'object' ? fullMessage.payload : null;
  const parts = collectMimeParts(payload);

  let htmlBody = '';
  let plainBody = '';

  for (const part of parts) {
    const mimeType = typeof part.mimeType === 'string' ? part.mimeType.toLowerCase() : '';
    const data = part.body && typeof part.body === 'object' ? part.body.data : null;
    const decoded = decodeBase64Url(data);

    if (!decoded) {
      continue;
    }

    if (!htmlBody && mimeType === 'text/html') {
      htmlBody = decoded;
    }

    if (!plainBody && mimeType === 'text/plain') {
      plainBody = decoded;
    }
  }

  // Some emails keep content directly in payload.body.data
  if (!htmlBody && payload && payload.mimeType === 'text/html') {
    htmlBody = decodeBase64Url(payload.body && payload.body.data);
  }
  if (!plainBody && payload && payload.mimeType === 'text/plain') {
    plainBody = decodeBase64Url(payload.body && payload.body.data);
  }

  const snippet = typeof fullMessage.snippet === 'string' ? fullMessage.snippet : '';
  const processingBody = plainBody || snippet || htmlBody;

  return {
    plainBody,
    htmlBody,
    processingBody,
  };
}

function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : require('http');
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': config.internalKey,
        'X-Tenant-ID': config.tenantId,
        ...options.headers,
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('🔄 Starting Gmail sync...');
  console.log(`📍 Backend: ${config.apiBaseUrl}`);
  console.log(`👤 Tenant: ${config.tenantId}\n`);
  console.log(`📆 Fetch window: last ${config.daysBack} day(s)`);
  console.log(`📬 Daily cap: ${config.maxMessagesPerDay} email(s) per day`);
  console.log(`📬 Per-account cap: ${config.maxMessagesPerAccount}\n`);

  setSyncStatus({
    status: 'running',
    tenantId: config.tenantId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    lastRunAt: null,
    accountsTotal: 0,
    accountsProcessed: 0,
    totalMessages: 0,
    processedMessages: 0,
    synced: 0,
    duplicates: 0,
    failed: 0,
    currentAccountId: null,
    error: null,
  });

  try {
    // 1. Get all email accounts for this tenant
    console.log('📧 Fetching email accounts...');
    const accountsRes = await httpRequest({
      url: `${config.apiBaseUrl}/internal/email-accounts`,
      method: 'GET',
    });

    if (accountsRes.status !== 200) {
      throw new Error(`Failed to fetch accounts: ${accountsRes.status}`);
    }

    const accounts = accountsRes.data;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      console.log('⏭️  No email accounts found\n');
      setSyncStatus({
        status: 'completed',
        endedAt: new Date().toISOString(),
        lastRunAt: new Date().toISOString(),
      });
      return;
    }

    console.log(`✅ Found ${accounts.length} account(s)\n`);
    setSyncStatus({ accountsTotal: accounts.length });

    let totalSynced = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;
    const accountFailures = [];

    // 2. For each active account, sync recent emails
    for (const account of accounts) {
      // All accounts from getActiveEmailAccounts are already active
      console.log(`📧 Syncing account: ${account.id}`);
      setSyncStatus({ currentAccountId: account.id });

      // Check if token needs refresh
      if (account.expires_at && new Date(account.expires_at).getTime() < Date.now()) {
        console.log('  🔄 Token expired, refreshing...');
        const refreshRes = await httpRequest({
          url: `${config.apiBaseUrl}/internal/email-accounts/${account.id}/refresh`,
          method: 'POST',
        });
        if (refreshRes.status !== 201) {
          const reason =
            typeof refreshRes.data?.message === 'string'
              ? refreshRes.data.message
              : `HTTP ${refreshRes.status}`;
          console.log(`  ❌ Token refresh failed: ${reason}`);
          accountFailures.push(`Account ${account.id}: token refresh failed (${reason})`);
          totalFailed += 1;
          setSyncStatus({
            failed: totalFailed,
            user_error: resolveUserError(reason),
            technical_error: reason,
            accountsProcessed: syncStatus.accountsProcessed + 1,
          });
          continue;
        }
        account.access_token = refreshRes.data.access_token;
      }

      // Fetch latest messages from Gmail (with pagination) so new emails are not missed.
      console.log('  📧 Fetching messages from Gmail...');
      const messagesRes = await fetchRecentMessageRefs(account.access_token);

      if (!messagesRes.ok) {
        console.log(`  ❌ Gmail fetch failed: ${messagesRes.status}`);
        accountFailures.push(`Account ${account.id}: Gmail fetch failed (HTTP ${messagesRes.status})`);
        totalFailed += 1;
        setSyncStatus({
          failed: totalFailed,
          user_error: resolveUserError(String(messagesRes.status)),
          technical_error: `Gmail fetch failed (HTTP ${messagesRes.status})`,
          accountsProcessed: syncStatus.accountsProcessed + 1,
        });
        continue;
      }

      const messageList = messagesRes.messages || [];
      console.log(`  ✅ Found ${messageList.length} messages`);
      setSyncStatus({ totalMessages: syncStatus.totalMessages + messageList.length });

      if (messageList.length === 0) {
        console.log('  (No new messages)\n');
        setSyncStatus({ accountsProcessed: syncStatus.accountsProcessed + 1 });
        continue;
      }

      // 3. For each message, get full details and send to backend
      for (const msgRef of messageList) {
        const fullRes = await httpRequest({
          url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
          },
        });

        if (fullRes.status !== 200) {
          console.log(`    ❌ Failed to get message ${msgRef.id}`);
          totalFailed += 1;
          setSyncStatus({
            failed: totalFailed,
            processedMessages: syncStatus.processedMessages + 1,
          });
          continue;
        }

        const headers = fullRes.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        const from = getHeader('From');
        const match = from.match(/^(.*)<([^>]+)>$/);
        const senderEmail = (match ? match[2] : from).trim().replace(/^"|"$/g, '');
        const senderName = (match ? match[1] : senderEmail).trim().replace(/^"|"$/g, '') || senderEmail;

        const { plainBody, htmlBody, processingBody } = extractMessageBodies(fullRes.data);

        const internalDateRaw =
          typeof fullRes.data.internalDate === 'string'
            ? Number.parseInt(fullRes.data.internalDate, 10)
            : Number.NaN;
        const receivedAt = Number.isFinite(internalDateRaw)
          ? new Date(internalDateRaw).toISOString()
          : new Date().toISOString();

        const emailData = {
          email_account_id: account.id,
          external_id: fullRes.data.id,
          thread_id: fullRes.data.threadId,
          sender_email: senderEmail,
          sender_name: senderName,
          subject: getHeader('Subject'),
          // Keep body parser-friendly; HTML is carried in raw_payload.
          body: processingBody,
          provider: 'gmail',
          received_at: receivedAt,
          raw_payload: {
            body_text: plainBody || processingBody,
            body_html: htmlBody,
            headers,
            gmail_payload: fullRes.data.payload || null,
          },
        };

        // Send to backend
        const ingestRes = await httpRequest({
          url: `${config.apiBaseUrl}/internal/email/inbound`,
          method: 'POST',
        }, emailData);

        if (ingestRes.status === 409 || ingestRes.data?.is_duplicate) {
          const shortSubject = (emailData.subject || '(No subject)').substring(0, 40);
          console.log(`    ⏭️  Duplicate: ${senderEmail} - ${shortSubject}`);
          totalDuplicates++;
          setSyncStatus({ duplicates: totalDuplicates });
        } else if (ingestRes.status === 201) {
          const shortSubject = (emailData.subject || '(No subject)').substring(0, 40);
          console.log(`    ✅ Synced: ${senderEmail} - ${shortSubject}`);
          totalSynced++;
          setSyncStatus({ synced: totalSynced });
        } else {
          console.log(`    ⚠️  Ingest failed (${ingestRes.status}): ${senderEmail}`);
          totalFailed++;
          setSyncStatus({ failed: totalFailed });
        }

        setSyncStatus({ processedMessages: syncStatus.processedMessages + 1 });
      }

      setSyncStatus({ accountsProcessed: syncStatus.accountsProcessed + 1 });
      console.log();
    }

    const completedAt = new Date().toISOString();
    const shouldFailRun = totalFailed > 0 && totalSynced === 0;
    const summaryError = accountFailures.length > 0 ? accountFailures.join(' | ') : null;
    const summaryUserError = summaryError ? resolveUserError(summaryError) : null;

    setSyncStatus({
      status: shouldFailRun ? 'failed' : 'completed',
      endedAt: completedAt,
      lastRunAt: completedAt,
      currentAccountId: null,
      error: shouldFailRun ? summaryUserError : null,
      user_error: shouldFailRun ? summaryUserError : null,
      technical_error: shouldFailRun ? summaryError : null,
    });

    if (shouldFailRun) {
      console.log(`\n❌ Sync failed. Imported ${totalSynced} email(s).\n`);
      if (summaryError) {
        console.log(`Reason: ${summaryError}\n`);
      }
      process.exit(1);
    }

    console.log(`\n✅ Sync complete! Imported ${totalSynced} email(s)\n`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const failedAt = new Date().toISOString();
    setSyncStatus({
      status: 'failed',
      endedAt: failedAt,
      lastRunAt: failedAt,
      currentAccountId: null,
      error: resolveUserError(errorMessage),
      user_error: resolveUserError(errorMessage),
      technical_error: errorMessage,
    });
    console.error('❌ Sync failed:', errorMessage);
    process.exit(1);
  }
}

main();
