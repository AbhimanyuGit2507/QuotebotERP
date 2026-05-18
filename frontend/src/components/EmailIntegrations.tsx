import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

interface EmailAccount {
  id: string;
  email_address: string;
  provider: string;
  is_active: boolean;
  created_at: string;
}

interface EmailIntegrationsProps {
  onSuccess?: () => void;
}

interface GmailSyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | string;
  phase?: string | null;
  progressPercent?: number | null;
  message?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  lastRunAt?: string | null;
  accountsTotal?: number;
  accountsProcessed?: number;
  totalMessages?: number;
  processedMessages?: number;
  synced?: number;
  duplicates?: number;
  failed?: number;
  error?: string | null;
  user_error?: string | null;
  technical_error?: string | null;
}

interface ClearInboxResponse {
  cleared: boolean;
  before?: {
    messages?: number;
    conversations?: number;
  };
}

export const EmailIntegrations: React.FC<EmailIntegrationsProps> = ({
  onSuccess,
}) => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<GmailSyncStatus | null>(null);
  const [clearingInbox, setClearingInbox] = useState(false);

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await apiRequest<GmailSyncStatus>('/email-integrations/sync-status');
      if (status.technical_error) {
        console.error('[Frontend][OAuth] Sync technical error:', status.technical_error);
      }
      setSyncStatus((previous) => {
        if (previous?.status === 'running' && status.status === 'completed' && onSuccess) {
          onSuccess();
        }
        return status;
      });
    } catch {
      // Ignore status polling errors to avoid disrupting OAuth/account UI.
    }
  }, [onSuccess]);

  const triggerSyncNow = useCallback(async () => {
    const result = await apiRequest<{ started?: boolean }>('/email-integrations/sync-now', {
      method: 'POST',
    });
    if (result.started) {
      setSuccessMessage('Gmail connected. Initial sync started.');
      setSyncStatus({
        status: 'running',
        phase: 'queued',
        progressPercent: 1,
        message: 'Sync queued',
      });
    }

    await loadSyncStatus();
  }, [loadSyncStatus]);

  const loadEmailAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Frontend][OAuth] Loading connected email accounts');

      const data = await apiRequest<EmailAccount[]>('/email-integrations');
      setAccounts(Array.isArray(data) ? data : []);
      console.log('[Frontend][OAuth] Accounts loaded:', Array.isArray(data) ? data.length : 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[Frontend][OAuth] Load accounts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load email accounts on mount
  useEffect(() => {
    loadEmailAccounts();
    loadSyncStatus();
  }, [loadEmailAccounts, loadSyncStatus]);
  // Handle OAuth callback state from URL query params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const legacyError = params.get('message');
    const success = params.get('success');
    const error = params.get('error');

    if (oauthStatus === 'success' || success === 'email_connected') {
      setSuccessMessage('Gmail account connected successfully');
      console.log('[Frontend][OAuth] Callback success received from backend redirect');
      loadEmailAccounts();
      loadSyncStatus();

      // Trigger explicitly from frontend too, in case callback trigger fails.
      triggerSyncNow().catch((syncErr) => {
        console.error('[Frontend][OAuth] Could not trigger immediate sync:', syncErr);
      });

      if (onSuccess) onSuccess();
    }

    if (oauthStatus === 'error' || error) {
      const decodedMessage = error
        ? decodeURIComponent(error)
        : legacyError
          ? decodeURIComponent(legacyError)
          : 'OAuth callback failed';
      setError(decodedMessage);
      console.error('[Frontend][OAuth] Callback error:', decodedMessage);
    }

    if (oauthStatus || success || error) {
      const nextUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, [loadEmailAccounts, loadSyncStatus, onSuccess, triggerSyncNow]);

  useEffect(() => {
    const intervalDelay = syncStatus?.status === 'running' ? 1500 : 5000;
    const interval = window.setInterval(() => {
      loadSyncStatus();
    }, intervalDelay);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadSyncStatus, syncStatus?.status]);

  const handleConnectGmail = async () => {
    try {
      setConnecting(true);
      setError(null);
      console.log('[Frontend][OAuth] Initiating Gmail OAuth flow');

      // Request OAuth authorization URL
      const { authorizationUrl } = await apiRequest<{ authorizationUrl: string }>('/email-integrations/oauth/authorize', {
        method: 'POST',
      });
      console.log('[Frontend][OAuth] Authorization URL received');

      // Redirect to Google OAuth
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        throw new Error('Missing authorization URL from backend');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      console.error('[Frontend][OAuth] Flow failed:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    try {
      setError(null);
      console.log('[Frontend][OAuth] Disconnecting account:', accountId);

      await apiRequest(`/email-integrations/${accountId}`, {
        method: 'DELETE',
      });

      setSuccessMessage('Email account disconnected successfully');
      await loadEmailAccounts();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnect failed';
      setError(message);
      console.error('[Frontend][OAuth] Disconnect error:', err);
    }
  };

  const handleClearInbox = async () => {
    const confirmed = window.confirm(
      'Clear inbox data now? This will permanently delete all inbox messages and conversations for this tenant.',
    );
    if (!confirmed) {
      return;
    }

    try {
      setClearingInbox(true);
      setError(null);

      const result = await apiRequest<ClearInboxResponse>('/email-integrations/clear-inbox', {
        method: 'POST',
      });
      const removedMessages = Number(result.before?.messages || 0);
      const removedConversations = Number(result.before?.conversations || 0);

      setSuccessMessage(
        `Inbox cleared. Removed ${removedMessages} messages and ${removedConversations} conversations.`,
      );
      if (onSuccess) onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Inbox clear failed';
      setError(message);
    } finally {
      setClearingInbox(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--erp-surface)] border border-[var(--erp-border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--erp-text)] mb-4">
          Email Integrations
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {syncStatus && syncStatus.status === 'running' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm font-medium text-blue-800">
              {syncStatus.message || 'Syncing Gmail inbox...'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {syncStatus.processedMessages || 0}/{syncStatus.totalMessages || 0} emails processed
              {' • '}
              {syncStatus.synced || 0} imported
            </p>
            <div className="mt-2 h-2 bg-blue-100 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${typeof syncStatus.progressPercent === 'number'
                    ? Math.max(1, Math.min(100, syncStatus.progressPercent))
                    : (syncStatus.totalMessages || 0) > 0
                      ? Math.min(
                          100,
                          Math.round(
                            ((syncStatus.processedMessages || 0) /
                              (syncStatus.totalMessages || 1)) *
                              100,
                          ),
                        )
                      : 5}%`,
                }}
              />
            </div>
          </div>
        )}

        {syncStatus && syncStatus.status === 'failed' && (syncStatus.user_error || syncStatus.error) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {syncStatus.user_error || syncStatus.error}
            <div className="mt-2 text-[12px] text-red-700">
              Reconnect Gmail to continue syncing new messages.
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-[var(--erp-text-muted)]">
              sync
            </span>
            <span className="ml-2 text-sm text-[var(--erp-text-muted)]">
              Loading email accounts...
            </span>
          </div>
        ) : accounts.length > 0 ? (
          <div className="space-y-3 mb-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-white border border-[var(--erp-border)] rounded"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {account.provider === 'gmail' ? (
                      <span className="material-symbols-outlined text-[var(--erp-accent)]">
                        mail
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[var(--erp-text-muted)]">
                        email
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--erp-text)] truncate">
                      {account.email_address}
                    </p>
                    <p className="text-xs text-[var(--erp-text-muted)]">
                      {account.provider.toUpperCase()} •{' '}
                      {account.is_active ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-red-600">Inactive</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(account.id)}
                  className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[var(--erp-text-muted)] block mb-2">
              mail_outline
            </span>
            <p className="text-sm text-[var(--erp-text-muted)]">
              No email accounts connected yet
            </p>
          </div>
        )}

        <button
          onClick={handleConnectGmail}
          disabled={connecting}
          className="btn btn-primary btn-block btn-lg"
        >
          {connecting ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">
                sync
              </span>
              Connecting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">
                add_circle
              </span>
              Connect Gmail Account
            </>
          )}
        </button>

        <button
          onClick={handleClearInbox}
          disabled={clearingInbox}
          className="btn btn-danger btn-block btn-lg mt-3"
        >
          {clearingInbox ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
              Clearing Inbox...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">delete</span>
              Clear Inbox Data
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-[var(--erp-text-muted)] bg-blue-50 border border-blue-200 rounded p-3">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click the button above to authorize access to your Gmail account</li>
          <li>We request read-only access to your emails and send capability</li>
          <li>Your access token is securely stored and automatically refreshed</li>
          <li>Inbox sync runs in the background and updates your inbox automatically</li>
        </ul>
      </div>
    </div>
  );
};
