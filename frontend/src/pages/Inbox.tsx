import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import PageLayout from '../components/common/PageLayout';
import { useApp, InboxMessage } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { exportToCSV, prepareInboxMessagesForExport, getDateStamp } from '../utils/exportUtils';
import {
  apiRequest,
  createRfqFromEmail,
  previewRfqFromEmail,
  postItemIntelligenceFeedback,
  RfqFromEmailItemPayload,
  RfqPreviewFromEmailResponse,
  retryInboxMessage,
  sendEmail,
} from '../services/api';

interface GmailSyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | string;
  phase?: string | null;
  progressPercent?: number | null;
  message?: string | null;
  totalMessages?: number;
  processedMessages?: number;
  synced?: number;
  duplicates?: number;
  failed?: number;
  error?: string | null;
  user_error?: string | null;
  technical_error?: string | null;
}

const Inbox: React.FC = () => {
  const { inboxMessages, updateInboxMessage, showToast, showConfirmModal, refreshData } = useApp();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const selectedId = useMemo(() => {
    if (!id || !inboxMessages.some((m) => m.id === id)) {
      return inboxMessages[0]?.id || null;
    }
    return id;
  }, [id, inboxMessages]);

  const [activeTab, setActiveTab] = useState<'raw' | 'parsed' | 'attachments'>('raw');
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<GmailSyncStatus | null>(null);
  const [manualSyncRequested, setManualSyncRequested] = useState(false);
  const [syncTriggering, setSyncTriggering] = useState(false);
  const [manualSyncRunningSeen, setManualSyncRunningSeen] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [creatingFromPreview, setCreatingFromPreview] = useState(false);
  const [pendingCreatePreview, setPendingCreatePreview] = useState<{
    message: InboxMessage;
    candidateItems: RfqFromEmailItemPayload[];
    preview: RfqPreviewFromEmailResponse;
    parsingSource: string;
    parsingConfidence: string;
  } | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeForm, setComposeForm] = useState<{
    to: string[];
    cc: string[];
    subject: string;
    body: string;
  }>({
    to: [],
    cc: [],
    subject: '',
    body: '',
  });
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'sender-asc' | 'sender-desc'>('date-desc');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [inlineReply, setInlineReply] = useState('');
  const [sendingInlineReply, setSendingInlineReply] = useState(false);
  const [threadMessages, setThreadMessages] = useState<InboxMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const hasAutoReloadedAfterSync = useRef(false);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const syncFailureNotified = useRef(false);

  const getMessageType = useCallback((message: InboxMessage) => {
    const classification = (message.classification || 'UNKNOWN').toUpperCase();
    if (classification === 'FOLLOWUP') {
      return 'followup';
    }

    if (classification === 'PO') {
      return 'po';
    }

    if (classification === 'RFQ') {
      return isMessageNotRfq(message) ? 'other' : 'inquiries';
    }

    if (message.rfqId || message.quotationId || message.autoRfqCreated || message.autoQuotationCreated) {
      return 'inquiries';
    }

    if (message.extractedItems > 0 || (message.parsedItems || []).length > 0) {
      return 'inquiries';
    }

    return 'other';
  }, []);

  const isArchivedMessage = useCallback((message: InboxMessage) => message.status === 'duplicate', []);
  const isNewMessage = useCallback((message: InboxMessage) => message.status === 'new', []);
  const isNeedsReviewMessage = useCallback(
    (message: InboxMessage) => message.status === 'needs_review' || message.status === 'failed',
    [],
  );

  const unreadStatusBuckets = useMemo(() => {
    return {
      new: inboxMessages.filter((message) => !message.isRead && isNewMessage(message)).length,
      needsReview: inboxMessages.filter((message) => !message.isRead && isNeedsReviewMessage(message)).length,
      archived: inboxMessages.filter((message) => !message.isRead && isArchivedMessage(message)).length,
    };
  }, [inboxMessages, isArchivedMessage, isNeedsReviewMessage, isNewMessage]);

  const unreadTypeCounts = useMemo(() => {
    const counts = {
      all: inboxMessages.filter((message) => !message.isRead).length,
      inquiries: 0,
      followup: 0,
      orders: 0,
      other: 0,
    };

    for (const message of inboxMessages) {
      if (message.isRead) {
        continue;
      }

      const type = getMessageType(message);
      if (type === 'followup') {
        counts.followup += 1;
      } else if (type === 'po') {
        counts.orders += 1;
      } else if (type === 'inquiries') {
        counts.inquiries += 1;
      } else {
        counts.other += 1;
      }
    }

    return counts;
  }, [getMessageType, inboxMessages]);

  const activeStatusChip = statusFilter === 'all' ? 'all' : statusFilter;

  const setStatusChip = useCallback((nextStatus: 'all' | 'new' | 'needs_review' | 'archived') => {
    setStatusFilter((prev) => (prev === nextStatus ? 'all' : nextStatus));
    setSelectedMessageIds(new Set());
  }, []);

  // Deselect status chips when Escape is pressed
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStatusFilter('all');
        setSelectedMessageIds(new Set());
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const setTypeFilter = useCallback((nextType: string) => {
    setClassificationFilter(nextType);
    setSelectedMessageIds(new Set());
  }, []);

  const setSourceFilterAndReset = useCallback((nextSource: 'all' | 'email' | 'whatsapp') => {
    setSourceFilter(nextSource);
    setSelectedMessageIds(new Set());
  }, []);

  const isMessageVisibleByStatus = useCallback((message: InboxMessage) => {
    if (statusFilter === 'all') {
      return true;
    }

    if (statusFilter === 'new') {
      return isNewMessage(message);
    }

    if (statusFilter === 'needs_review') {
      return isNeedsReviewMessage(message);
    }

    if (statusFilter === 'archived') {
      return isArchivedMessage(message);
    }

    return true;
  }, [isArchivedMessage, isNeedsReviewMessage, isNewMessage, statusFilter]);

  const isMessageTypeVisible = useCallback((message: InboxMessage) => {
    if (classificationFilter === 'all') {
      return true;
    }

    const type = getMessageType(message);
    if (classificationFilter === 'orders') {
      return type === 'po';
    }

    return type === classificationFilter;
  }, [classificationFilter, getMessageType]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await apiRequest<GmailSyncStatus>('/email-integrations/sync-status');
      setSyncStatus(status);
    } catch {
      // Ignore optional sync status fetch failures in inbox UI.
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let manualSyncPolling: unknown = null;
    const isSyncRunning = syncStatus?.status === 'running';

    const refreshSyncStatus = async () => {
      if (!isMounted) {
        return;
      }
      await loadSyncStatus();
    };

    void refreshSyncStatus();
    const interval = window.setInterval(() => {
      void refreshSyncStatus();
    }, 5000);

    // Special fast polling for manual sync
    if (manualSyncRequested || isSyncRunning) {
      manualSyncPolling = window.setInterval(() => {
        void refreshSyncStatus();
      }, 1000); // Poll every 1 second during manual sync
    }

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      if (manualSyncPolling) {
        window.clearInterval(manualSyncPolling as number);
      }
    };
  }, [loadSyncStatus, manualSyncRequested, syncStatus]);

  useEffect(() => {
    if (!syncStatus || syncStatus.status !== 'failed') {
      return;
    }

    if (syncFailureNotified.current) {
      return;
    }

    const userMessage =
      syncStatus.user_error || syncStatus.error || 'Inbox sync failed.';
    showToast(userMessage, 'error');

    if (syncStatus.technical_error) {
      console.error('[Inbox Sync]', syncStatus.technical_error);
    }

    syncFailureNotified.current = true;
  }, [showToast, syncStatus]);

  useEffect(() => {
    if (!manualSyncRequested || !syncStatus) {
      return;
    }

    if (syncStatus.status === 'running') {
      setManualSyncRunningSeen(true);
      return;
    }

    if (!manualSyncRunningSeen) {
      return;
    }

    if (syncStatus.status === 'completed') {
      setManualSyncRequested(false);
      setManualSyncRunningSeen(false);
      const added = Number(syncStatus.synced || 0);
      if (added > 0) {
        showToast(`Inbox sync completed. ${added} email(s) added.`, 'success');
      } else {
        showToast('Inbox sync completed. No new emails found.', 'info');
      }

      if (!hasAutoReloadedAfterSync.current) {
        hasAutoReloadedAfterSync.current = true;
        window.setTimeout(() => {
          window.location.reload();
        }, 450);
      }
    } else if (syncStatus.status === 'failed') {
      setManualSyncRequested(false);
      setManualSyncRunningSeen(false);
      showToast(
        syncStatus.user_error || syncStatus.error || 'Inbox sync failed',
        'error',
      );
    }
  }, [manualSyncRequested, manualSyncRunningSeen, showToast, syncStatus]);

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/inbox', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/inbox/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let filtered = inboxMessages.filter(msg => {
      const matchesSearch = msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           msg.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = sourceFilter === 'all' || msg.channel === sourceFilter;
      const matchesStatus = isMessageVisibleByStatus(msg);
      
      const matchesClassification = isMessageTypeVisible(msg);
      
      return matchesSearch && matchesSource && matchesStatus && matchesClassification;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'sender-asc':
          return a.sender.localeCompare(b.sender);
        case 'sender-desc':
          return b.sender.localeCompare(a.sender);
        default:
          return 0;
      }
    });

    return filtered;
  }, [inboxMessages, isMessageTypeVisible, isMessageVisibleByStatus, searchQuery, sortBy, sourceFilter]);

  const selectedMessage = inboxMessages.find(m => m.id === selectedId);
  const selectedMessageCount = selectedMessageIds.size;

  const getParsingSourceLabel = (source: string) => {
    const normalized = source.toLowerCase();

    switch (normalized) {
      case 'backend_regex_classifier':
      case 'regex':
        return 'Regex classifier';
      case 'backend_llm_classifier':
      case 'llm_classifier':
        return 'LLM classifier';
      case 'backend_llm_extractor':
      case 'llm_extractor':
        return 'LLM extractor';
      case 'backend_llm_pipeline':
      case 'rfq_workflow':
        return 'RFQ pipeline';
      case 'rfq_unresolved':
        return 'RFQ review';
      case 'not_rfq':
        return 'Non-RFQ';
      default:
        return normalized ? normalized.replace(/_/g, ' ') : 'Unknown';
    }
  };

  const isParsingFailureMessage = (value: string) => {
    const normalized = value.toLowerCase();
    return [
      'failed',
      'error',
      'rate-limited',
      'rate limited',
      'temporarily',
      'invalid',
      'missing',
      'unable',
      'could not',
      'timeout',
      'below threshold',
    ].some((keyword) => normalized.includes(keyword));
  };

  const handleToggleSelection = useCallback(
    (messageId: string, index: number, shiftKey: boolean) => {
      setSelectedMessageIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastSelectedIndexRef.current !== null) {
          const start = Math.min(lastSelectedIndexRef.current, index);
          const end = Math.max(lastSelectedIndexRef.current, index);
          filteredMessages.slice(start, end + 1).forEach((msg) => {
            next.add(msg.id);
          });
        } else if (next.has(messageId)) {
          next.delete(messageId);
        } else {
          next.add(messageId);
        }
        return next;
      });
      lastSelectedIndexRef.current = index;
    },
    [filteredMessages],
  );

  const handleRowClick = (
    event: React.MouseEvent,
    msg: InboxMessage,
    index: number,
  ) => {
    if (event.shiftKey) {
      event.preventDefault();
      handleToggleSelection(msg.id, index, true);
      return;
    }
    setSelectedMessageIds(new Set());
    lastSelectedIndexRef.current = index;
    handleSelectMessage(msg);
  };

  const handleListContainerClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      return;
    }
    if (event.target === event.currentTarget) {
      setSelectedMessageIds(new Set());
      lastSelectedIndexRef.current = null;
    }
  };

  const handleCheckboxClick = (
    event: React.MouseEvent,
    msg: InboxMessage,
    index: number,
  ) => {
    event.stopPropagation();
    handleToggleSelection(msg.id, index, event.shiftKey);
  };

  const isMessageNotRfq = (msg: InboxMessage) => {
    const source = (msg.parsingSource || '').toLowerCase();
    const parsingError = (msg.parsingError || '').toLowerCase();

    if (source === 'not_rfq') return true;
    if (source === 'classified_non_rfq') return true;
    if (source === 'classified_non_rfq_regex') return true;
    if (parsingError.includes('non-rfq') || parsingError.includes('not rfq')) {
      return true;
    }

    return (
      (source === 'llm_classifier' || source === 'backend_llm_classifier') &&
      msg.extractedItems <= 0 &&
      !msg.autoRfqCreated &&
      !msg.rfqId &&
      !msg.quotationId
    );
  };

  const isMessageRfq = (msg: InboxMessage) => {
    if (isMessageNotRfq(msg)) return false;

    const source = (msg.parsingSource || '').toLowerCase();
    if (msg.quotationId) return true;
    if (msg.rfqId) return true;
    if (msg.autoRfqCreated) return true;
    if (msg.extractedItems > 0) return true;
    return [
      'llm',
      'llm_extractor',
      'backend_llm_extractor',
      'backend_llm_pipeline',
      'rfq_workflow',
      'regex',
      'rfq_detected',
    ].includes(source);
  };

  const isFollowupMessage = (msg: InboxMessage) => {
    const classification = (msg as any).classification || '';
    return classification.toLowerCase() === 'followup';
  };

  const requiresManualAssistance = (msg: InboxMessage) => {
    return isFollowupMessage(msg) && msg.status !== 'duplicate';
  };

  const extractItemsFromRawText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const items = lines
      .map((line) => {
        const normalized = line.replace(/^\d+[).:\s-]*/, '').trim();
        const explicitQty = normalized.match(/(.+?)\s+(?:for|x|qty[:\s]*)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/i);
        const trailingQty = normalized.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)?$/i);
        const match = explicitQty || trailingQty;

        if (!match) {
          return null;
        }

        const product_name = (match[1] || '').trim();
        const quantity = Number(match[2] || 0);
        const unit = (match[3] || 'pcs').toLowerCase();

        if (!product_name || !Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }

        return {
          product_name,
          quantity,
          unit,
          notes: 'Recovered from raw message text (manual fallback).',
        };
      })
      .filter((item): item is { product_name: string; quantity: number; unit: string; notes: string } => Boolean(item));

    return items;
  };

  const handleMarkAsRead = (msg: InboxMessage) => {
    if (!msg.isRead) {
      updateInboxMessage(msg.id, { isRead: true });
    }
  };

  const handleSelectMessage = (msg: InboxMessage) => {
    handleMarkAsRead(msg);
    navigate(`/inbox/${msg.id}`);
  };

  const handleConvertToRFQ = async (msg: InboxMessage) => {
    const parsedItems = msg.parsedItems || [];
    const fallbackItems =
      parsedItems.length > 0
        ? []
        : extractItemsFromRawText(msg.content || msg.preview || '');
    const candidateItems = parsedItems.length > 0 ? parsedItems : fallbackItems;

    if (candidateItems.length <= 0) {
      showToast('No extracted items available to create an RFQ. Add a quantity like "for 10 pcs" in the message.', 'warning');
      return;
    }

    if (msg.status === 'duplicate') {
      showToast('Archived messages cannot be converted to RFQ.', 'warning');
      return;
    }

    if (!msg.from) {
      showToast('Sender email is required to create RFQ from parsed data.', 'warning');
      return;
    }

    try {
      const preview = await previewRfqFromEmail({
        client_email: msg.from,
        message_id: msg.id,
        items: candidateItems,
      });

      if (!preview.matched_items?.length) {
        showToast(
          preview.summary ||
            'No valid and available catalog products matched extracted items.',
          'warning',
        );
        return;
      }

      setPendingCreatePreview({
        message: msg,
        candidateItems,
        preview,
        parsingSource:
          parsedItems.length > 0
            ? msg.parsingSource || 'manual_inbox_action'
            : 'manual_text_fallback',
        parsingConfidence: msg.parsingConfidence || 'medium',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create RFQ from extracted data';
      showToast(message, 'error');
    }
  };

  const handleConfirmCreateFromPreview = async () => {
    if (!pendingCreatePreview) {
      return;
    }

    const { message, preview, parsingSource, parsingConfidence } = pendingCreatePreview;

    try {
      setCreatingFromPreview(true);

      const created = await createRfqFromEmail({
        client_email: message.from || '',
        message_id: message.id,
        parsing_source: parsingSource,
        parsing_confidence: parsingConfidence,
        items: preview.matched_items,
      });

      await apiRequest(`/inbox/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          processing_status: 'parsed',
          auto_rfq_created: false,
          rfq_id: created?.id,
        }),
      });

      updateInboxMessage(message.id, { status: 'parsed' });
      await refreshData();
      // navigate to created RFQ or quotation if available
      if (created?.id) {
        navigate(`/rfqs/${created.id}`);
      } else if (created?.quotation_id) {
        navigate(`/quotations/${created.quotation_id}`);
      }

      setPendingCreatePreview(null);
      showToast(
        created?.number
          ? `RFQ ${created.number} created from extracted data.${preview.unmatched_items?.length ? ` ${preview.unmatched_items.length} item(s) were rejected.` : ''}`
          : `RFQ created from extracted data.${preview.unmatched_items?.length ? ` ${preview.unmatched_items.length} item(s) were rejected.` : ''}`,
        'success',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not create RFQ from extracted data';
      showToast(message, 'error');
    } finally {
      setCreatingFromPreview(false);
    }
  };

  const handleEditExtractedData = (msg: InboxMessage) => {
    updateInboxMessage(msg.id, { status: 'needs_review' });
    setActiveTab('raw');
    showToast('Marked for manual extraction review in Raw Message tab.', 'info');
  };

  const handleArchive = (msg: InboxMessage) => {
    showConfirmModal(
      'Archive Message',
      `Are you sure you want to archive this message from ${msg.sender}?`,
      () => {
        updateInboxMessage(msg.id, { status: 'duplicate' });
        showToast('Message archived', 'success');
      }
    );
  };

  const handleMarkNeedsReview = (msg: InboxMessage) => {
    updateInboxMessage(msg.id, { status: 'needs_review' });
    showToast('Marked for review', 'warning');
  };

  const waitForMessageRefresh = useCallback(
    async (messageId: string, expectedRetryCount: number, timeoutMs = 30000) => {
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
        try {
          const latestMessages = await apiRequest<InboxMessage[]>('/inbox/messages?limit=200');
          const refreshedMessage = latestMessages.find((message) => message.id === messageId);

          if (
            refreshedMessage &&
            ((refreshedMessage.retryCount ?? 0) >= expectedRetryCount ||
              (refreshedMessage.parsedItems || []).length > 0 ||
              refreshedMessage.status === 'parsed')
          ) {
            await refreshData();
            return refreshedMessage;
          }
        } catch {
          // Ignore transient polling errors while the backend is processing.
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      await refreshData();
      return null;
    },
    [refreshData],
  );

  const handleBulkArchive = () => {
    const ids = Array.from(selectedMessageIds);
    if (!ids.length) {
      return;
    }

    showConfirmModal(
      'Archive Messages',
      `Archive ${ids.length} message(s)?`,
      () => {
        ids.forEach((messageId) => {
          updateInboxMessage(messageId, { status: 'duplicate' });
        });
        setSelectedMessageIds(new Set());
        showToast(`Archived ${ids.length} message(s).`, 'success');
      },
    );
  };

  const executeRetryParsing = async (msg: InboxMessage, forceRetry: boolean) => {
    try {
      setRetryingMessageId(msg.id);
      const retriedAt = new Date().toISOString();
      const nextRetryCount = Number(msg.retryCount || 0) + 1;
      const previousProcessingStatus: 'pending' | 'parsed' | 'failed' =
        msg.status === 'failed' ? 'failed' : msg.status === 'parsed' ? 'parsed' : 'pending';

      const retryHistoryEntry: NonNullable<InboxMessage['retryHistory']>[number] = {
        retried_at: retriedAt,
        retried_by: 'manual_inbox_action',
        reason: 'Manual retry requested from inbox UI.',
        previous_processing_status: previousProcessingStatus,
        ...(msg.parsingSource ? { previous_parsing_source: msg.parsingSource } : {}),
        ...(msg.parsingError ? { previous_parsing_error: msg.parsingError } : {}),
        ...(msg.extractedItems > 0 ? { previous_item_count: msg.extractedItems } : {}),
        forced: forceRetry,
      };

      await retryInboxMessage(msg.id, {
        force_retry: forceRetry,
        reason: retryHistoryEntry.reason,
      });

      updateInboxMessage(msg.id, {
        status: 'new',
        extractedItems: 0,
        parsedItems: [],
        parsingSource: 'manual_retry_requested',
        parsingConfidence: '',
        parsingError: '',
        rfqId: '',
        quotationId: '',
        autoRfqCreated: false,
        autoQuotationCreated: false,
        retryCount: nextRetryCount,
        lastRetryAt: retriedAt,
        retryHistory: [retryHistoryEntry, ...(msg.retryHistory || [])].slice(0, 10),
      });

      const syncResponse = await apiRequest<{
        started?: boolean;
        reason?: string;
        status?: { status?: string };
      }>('/email-integrations/sync-now', {
        method: 'POST',
      });

      if (syncResponse?.started || syncResponse?.status?.status === 'running') {
        showToast('Message re-queued. Parsing retry started.', 'info');
      } else {
        showToast(
          syncResponse?.reason || 'Message re-queued for next parsing cycle.',
          'info',
        );
      }

      await waitForMessageRefresh(msg.id, nextRetryCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not retry parsing';
      showToast(message, 'error');
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleRetryParsing = (msg: InboxMessage) => {
    const hasLinkedArtifacts =
      Boolean(msg.rfqId) ||
      Boolean(msg.quotationId) ||
      msg.autoRfqCreated ||
      msg.autoQuotationCreated;

    if (!hasLinkedArtifacts) {
      void executeRetryParsing(msg, false);
      return;
    }

    showConfirmModal(
      'Retry Parsing For Linked Message',
      'This message is already linked to an RFQ or quotation. Retrying can cause duplicate records. Continue anyway?',
      () => {
        void executeRetryParsing(msg, true);
      },
    );
  };

  const handleRetryFailedMessages = () => {
    const failedMessages = filteredMessages.filter(
      (message) => message.status === 'failed' || message.status === 'needs_review',
    );

    if (failedMessages.length === 0) {
      showToast('No failed/review messages found in current filter.', 'info');
      return;
    }

    showConfirmModal(
      'Retry Failed/Review Messages',
      `Retry parsing for ${failedMessages.length} message(s)? Linked records will be force-retried.`,
      () => {
        void (async () => {
          setBulkRetrying(true);
          let retried = 0;
          let failed = 0;

          for (const message of failedMessages.slice(0, 50)) {
            const hasLinkedArtifacts =
              Boolean(message.rfqId) ||
              Boolean(message.quotationId) ||
              message.autoRfqCreated ||
              message.autoQuotationCreated;

            try {
              await retryInboxMessage(message.id, {
                force_retry: hasLinkedArtifacts,
                reason: 'Bulk retry requested from Inbox page.',
              });
              retried += 1;
            } catch {
              failed += 1;
            }
          }

          try {
            await apiRequest('/email-integrations/sync-now', { method: 'POST' });
          } catch {
            // Ignore scheduler trigger failures; queueing already happened.
          }

          await refreshData();
          if (retried > 0 && failed === 0) {
            showToast(`Re-queued ${retried} message(s) for parsing.`, 'success');
          } else if (retried > 0) {
            showToast(`Re-queued ${retried} message(s), ${failed} failed to queue.`, 'warning');
          } else {
            showToast('Could not queue selected messages for re-parse.', 'error');
          }

          setBulkRetrying(false);
        })();
      },
    );
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'email' ? 'mail' : 'chat';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatRetryTimestamp = (value?: string) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getParsingStatusMeta = (message: InboxMessage) => {
    const status = message.status;
    const source = (message.parsingSource || '').toLowerCase();

    // If backend has provided a parsing_error while still pending, show rate-limited/queued hint
    if (status === 'new' && message.parsingError) {
      const err = (message.parsingError || '').toLowerCase();
      if (err.includes('rate') || err.includes('rate-limited') || err.includes('temporarily')) {
        return {
          label: 'Queued (Rate-limited)',
          detail: message.parsingError || 'Message is queued and waiting for retry by backend.',
          icon: 'schedule',
          chipClass: 'bg-blue-100 text-blue-700 border-blue-200',
          panelClass: 'bg-blue-50 border-blue-200 text-blue-800',
          progressStep: 1 as const,
        };
      }
    }

    if (source === 'backend_llm_classifier' && status === 'parsed') {
      return {
        label: 'Classification Complete',
        detail: 'RFQ classifier finished. Ready for extraction results.',
        icon: 'rule_settings',
        chipClass: 'bg-sky-100 text-sky-700 border-sky-200',
        panelClass: 'bg-sky-50 border-sky-200 text-sky-800',
        progressStep: 2 as const,
      };
    }

    if (source === 'backend_llm_pipeline' && !message.autoRfqCreated) {
      return {
        label: 'Extracted (Review)',
        detail: 'Items extracted. Manual review required before RFQ creation.',
        icon: 'hourglass_top',
        chipClass: 'bg-amber-100 text-amber-700 border-amber-200',
        panelClass: 'bg-amber-50 border-amber-200 text-amber-800',
        progressStep: 2 as const,
      };
    }

    if (source === 'backend_llm_extractor' && status === 'failed') {
      return {
        label: 'Extraction Failed',
        detail: 'RFQ detected, but item extraction failed. See error summary.',
        icon: 'error',
        chipClass: 'bg-red-100 text-red-700 border-red-200',
        panelClass: 'bg-red-50 border-red-200 text-red-800',
        progressStep: 2 as const,
      };
    }

    if (source === 'rfq_unresolved' && status === 'parsed') {
      return {
        label: 'RFQ Detected (Low Match)',
        detail: 'RFQ intent detected. Items need manual validation.',
        icon: 'warning',
        chipClass: 'bg-amber-100 text-amber-700 border-amber-200',
        panelClass: 'bg-amber-50 border-amber-200 text-amber-800',
        progressStep: 2 as const,
      };
    }
    const meta: Record<
      InboxMessage['status'],
      {
        label: string;
        detail: string;
        icon: string;
        chipClass: string;
        panelClass: string;
        progressStep: 1 | 2 | 3;
      }
    > = {
      new: {
        label: 'Queued For RFQ Analysis',
        detail: 'This message is waiting to be analyzed for RFQ items.',
        icon: 'schedule',
        chipClass: 'bg-blue-100 text-blue-700 border-blue-200',
        panelClass: 'bg-blue-50 border-blue-200 text-blue-800',
        progressStep: 1,
      },
      needs_review: {
        label: 'Needs Manual Review',
        detail: 'Automatic extraction was partial or uncertain. Manual check is recommended.',
        icon: 'flag',
        chipClass: 'bg-amber-100 text-amber-700 border-amber-200',
        panelClass: 'bg-amber-50 border-amber-200 text-amber-800',
        progressStep: 2,
      },
      parsed: {
        label: message.autoQuotationCreated
          ? 'Draft Quote Ready'
          : message.autoRfqCreated
            ? 'RFQ Created'
            : 'RFQ Detected',
        detail: message.autoQuotationCreated
          ? 'RFQ and draft quotation are ready to send.'
          : message.autoRfqCreated
            ? 'RFQ created automatically from extracted items.'
            : 'RFQ intent detected with extractable items.',
        icon: 'task_alt',
        chipClass: 'bg-green-100 text-green-700 border-green-200',
        panelClass: 'bg-green-50 border-green-200 text-green-800',
        progressStep: 3,
      },
      failed: {
        label: 'Parsing Failed',
        detail: 'Parsing failed. Manual follow-up required.',
        icon: 'error',
        chipClass: 'bg-red-100 text-red-700 border-red-200',
        panelClass: 'bg-red-50 border-red-200 text-red-800',
        progressStep: 1,
      },
      duplicate: {
        label: 'Archived (Not RFQ)',
        detail: 'Message archived and excluded from RFQ extraction.',
        icon: 'inventory_2',
        chipClass: 'bg-slate-100 text-slate-700 border-slate-200',
        panelClass: 'bg-slate-100 border-slate-200 text-slate-700',
        progressStep: 1,
      },
    };

    if (status === 'parsed' && isMessageNotRfq(message)) {
      return {
        label: 'Not RFQ',
        detail: 'Classified as non-RFQ. No action required.',
        icon: 'shield',
        chipClass: 'bg-slate-100 text-slate-700 border-slate-200',
        panelClass: 'bg-slate-100 border-slate-200 text-slate-700',
        progressStep: 1 as const,
      };
    }

    if (status === 'parsed' && isMessageRfq(message) && !message.autoRfqCreated) {
      return {
        label: 'RFQ Detected',
        detail: 'RFQ intent detected and items extracted.',
        icon: 'manage_search',
        chipClass: 'bg-green-100 text-green-700 border-green-200',
        panelClass: 'bg-green-50 border-green-200 text-green-800',
        progressStep: 3 as const,
      };
    }

    return meta[status];
  };

  const handleExportMessages = () => {
    const data = prepareInboxMessagesForExport(filteredMessages);
    exportToCSV(data, `inbox_messages_${getDateStamp()}.csv`);
  };

  const handleManualSync = async () => {
    try {
      setSyncTriggering(true);
      syncFailureNotified.current = false;
      const response = await apiRequest<{
        started?: boolean;
        reason?: string;
        status?: { status?: string };
      }>('/email-integrations/sync-now', {
        method: 'POST',
      });

      if (response?.started) {
        setManualSyncRequested(true);
        setManualSyncRunningSeen(false);
        hasAutoReloadedAfterSync.current = false;
        setSyncStatus((previous) => ({
          ...(previous || {}),
          status: 'running',
          phase: 'queued',
          progressPercent: 1,
          message: 'Sync queued',
        }));
        void loadSyncStatus();
        window.setTimeout(() => {
          void loadSyncStatus();
        }, 1200);
        showToast('Manual inbox sync started', 'info');
      } else if (response?.status?.status === 'running') {
        setManualSyncRequested(true);
        setManualSyncRunningSeen(true);
        void loadSyncStatus();
        showToast(response?.reason || 'Sync already in progress', 'info');
      } else {
        showToast(response?.reason || 'Sync already in progress', 'info');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start inbox sync';
      showToast(message, 'error');
    } finally {
      setSyncTriggering(false);
    }
  };

  const handleOpenCompose = (msg: InboxMessage) => {
    setComposeForm({
      to: msg.from ? [msg.from] : [],
      cc: [],
      subject: `Re: ${msg.subject || ''}`,
      body: `\n\n---\nOriginal Message:\n${msg.preview || msg.content || ''}\n`,
    });
    setShowComposeModal(true);
  };

  const handleSendEmail = async () => {
    if (!composeForm.to.length || !composeForm.body.trim()) {
      showToast('Email recipient and body are required.', 'warning');
      return;
    }

    try {
      setComposing(true);
      await sendEmail({
        to: composeForm.to,
        cc: composeForm.cc.length > 0 ? composeForm.cc : undefined,
        subject: composeForm.subject,
        body: composeForm.body,
      });
      showToast('Email sent successfully!', 'success');
      setShowComposeModal(false);
      setComposeForm({ to: [], cc: [], subject: '', body: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send email';
      showToast(message, 'error');
    } finally {
      setComposing(false);
    }
  };

  const handleCloseCompose = () => {
    setShowComposeModal(false);
    setComposeForm({ to: [], cc: [], subject: '', body: '' });
  };

  const handleSendInlineReply = async () => {
    if (!selectedMessage || !inlineReply.trim()) {
      showToast('Reply message is required.', 'warning');
      return;
    }

    try {
      setSendingInlineReply(true);
      await sendEmail({
        to: selectedMessage.from ? [selectedMessage.from] : [],
        subject: `Re: ${selectedMessage.subject || ''}`,
        body: inlineReply,
      });
      showToast('Reply sent successfully!', 'success');
      setInlineReply('');
      setShowInlineReply(false);
      await refreshData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send reply';
      showToast(message, 'error');
    } finally {
      setSendingInlineReply(false);
    }
  };

  const loadThreadMessages = useCallback(async (messageId: string) => {
    try {
      setLoadingThread(true);
      // Fetch conversation messages for this message
      const response = await apiRequest<any>(`/inbox/messages/${messageId}/thread`);
      setThreadMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load thread:', error);
      setThreadMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      void loadThreadMessages(selectedMessage.id);
    }
  }, [selectedMessage, loadThreadMessages]);

  const parsingStatusMeta = selectedMessage
    ? getParsingStatusMeta(selectedMessage)
    : null;
  const parsedItems = selectedMessage?.parsedItems || [];
  const showExtractedItemsTab = Boolean(
    selectedMessage && (
      isMessageRfq(selectedMessage) ||
      selectedMessage.classification === 'PO' ||
      parsedItems.length > 0 ||
      selectedMessage.extractedItems > 0
    ),
  );
  const showAttachmentsTab = Boolean(selectedMessage?.attachments?.length);
  // Configure DOMPurify to handle cid: URLs properly
  const configureDOMPurify = useCallback(() => {
    DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
      // Remove cid: URLs from src attributes
      if (node.hasAttribute && node.hasAttribute('src')) {
        const src = node.getAttribute('src') || '';
        if (src.startsWith('cid:')) {
          node.removeAttribute('src');
        }
      }
    });
  }, []);

  useEffect(() => {
    configureDOMPurify();
    return () => {
      DOMPurify.removeHook('beforeSanitizeAttributes');
    };
  }, [configureDOMPurify]);

  const sanitizedHtml = selectedMessage?.contentHtml
    ? DOMPurify.sanitize(selectedMessage.contentHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
        FORBID_ATTR: ['style'],
      })
    : '';
  const syncProgressPercent = useMemo(() => {
    if (!syncStatus) {
      return 0;
    }

    if (typeof syncStatus.progressPercent === 'number') {
      return Math.max(1, Math.min(100, syncStatus.progressPercent));
    }

    // If status is completed, show 100%
    if (syncStatus.status === 'completed') {
      return 100;
    }

    // If status is not running, show 0%
    if (syncStatus.status !== 'running') {
      return 0;
    }

    const total = Number(syncStatus.totalMessages || 0);
    const processed = Number(syncStatus.processedMessages || 0);
    
    // If total is 0 or not set, show indeterminate progress (10%)
    if (total <= 0) {
      return 10;
    }

    // Calculate percentage, ensuring it doesn't exceed 99% while running
    const percent = Math.round((processed / total) * 100);
    return Math.max(1, Math.min(99, percent));
  }, [syncStatus]);

  useEffect(() => {
    if (activeTab === 'raw' || (activeTab === 'parsed' && showExtractedItemsTab) || (activeTab === 'attachments' && showAttachmentsTab)) {
      return;
    }

    setActiveTab('raw');
  }, [activeTab, showAttachmentsTab, showExtractedItemsTab]);

  const shouldShowSyncBanner =
    syncTriggering ||
    syncStatus?.status === 'running' ||
    (manualSyncRequested && syncStatus?.status !== 'completed' && syncStatus?.status !== 'failed');

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {shouldShowSyncBanner && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-blue-800">
                {syncStatus?.status === 'running'
                  ? `${syncStatus.message || 'Syncing inbox...'} ${syncProgressPercent}%`
                  : syncTriggering
                    ? 'Starting inbox sync...'
                    : 'Inbox sync pending...'}
              </p>
              <p className="text-xs text-blue-700">
                Found new emails: {syncStatus?.synced || 0} • Duplicates: {syncStatus?.duplicates || 0}
              </p>
            </div>
            <div className="mt-2 h-1 w-full bg-blue-200 rounded">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded"
                style={{
                  width: `${syncProgressPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Message List */}
      <aside className="w-96 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
        <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-3 shrink-0">
          <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase tracking-wider">Inbox</h2>
          <div className="flex items-center gap-2">
            <select
              className="text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white min-w-[8.5rem]"
              value={sourceFilter}
              onChange={(e) => setSourceFilterAndReset(e.target.value as 'all' | 'email' | 'whatsapp')}
            >
              <option value="all">All Mail</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <button
              onClick={handleRetryFailedMessages}
              disabled={bulkRetrying}
              className="p-1 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Retry failed/review messages"
            >
              <span className={`material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)] ${bulkRetrying ? 'animate-spin' : ''}`}>
                restart_alt
              </span>
            </button>
            <button
              onClick={handleManualSync}
              disabled={syncTriggering}
              className="p-1 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync inbox now"
              data-action="sync-inbox"
            >
              <span className={`material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)] ${syncTriggering ? 'animate-spin' : ''}`}>
                sync
              </span>
            </button>
            <button 
              onClick={handleExportMessages}
              className="p-1 hover:bg-slate-200 rounded"
              title="Export to CSV"
              data-action="export-csv"
            >
              <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">download</span>
            </button>
            {selectedMessageCount > 0 ? (
              <>
                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {selectedMessageCount} selected
                </span>
                <button
                  onClick={handleBulkArchive}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="Delete selected"
                >
                  <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">delete</span>
                </button>
                <button
                  onClick={handleBulkArchive}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="Archive selected"
                >
                  <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">archive</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
        
        {/* Filters */}
        <div className="p-2 border-b border-[var(--erp-border)] space-y-2 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 !text-[16px]">search</span>
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full text-sm border border-[var(--erp-border)] rounded pl-7 pr-2 py-1.5 focus:ring-1 focus:ring-[var(--erp-accent)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-search="inbox"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select 
              className="flex-1 text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
              value={classificationFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types ({unreadTypeCounts.all})</option>
              <option value="inquiries">Inquiries ({unreadTypeCounts.inquiries})</option>
              <option value="followup">Followups ({unreadTypeCounts.followup})</option>
              <option value="orders">Orders ({unreadTypeCounts.orders})</option>
              <option value="other">Other ({unreadTypeCounts.other})</option>
            </select>
            <select 
              className="w-48 text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="sender-asc">Sender A-Z</option>
              <option value="sender-desc">Sender Z-A</option>
            </select>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)] flex gap-2 text-[11px] flex-wrap">
          {[
            { key: 'new', label: 'New', count: unreadStatusBuckets.new, className: 'bg-blue-100 text-blue-700 border-blue-200' },
            { key: 'needs_review', label: 'Needs Review', count: unreadStatusBuckets.needsReview, className: 'bg-amber-100 text-amber-700 border-amber-200' },
            { key: 'archived', label: 'Archived', count: unreadStatusBuckets.archived, className: 'bg-slate-100 text-slate-700 border-slate-200' },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatusChip(chip.key as 'new' | 'needs_review' | 'archived')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold transition-colors ${chip.className} ${activeStatusChip === chip.key ? 'ring-2 ring-offset-1 ring-[var(--erp-accent)]' : 'hover:opacity-90'}`}
            >
              <span>{chip.label}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/60 text-current">{chip.count}</span>
            </button>
          ))}
        </div>

        {/* Message List */}
        <div
          className="flex-1 overflow-y-auto select-none"
          onClick={handleListContainerClick}
        >
          {filteredMessages.map((msg, index) => {
            const isFollowup = isFollowupMessage(msg);
            const needsAssistance = requiresManualAssistance(msg);
            
            return (
            <div 
              key={msg.id}
              onClick={(event) => handleRowClick(event, msg, index)}
              className={`p-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === msg.id || selectedMessageIds.has(msg.id)
                  ? 'bg-blue-50 border-l-[3px] !border-l-[var(--erp-accent)]'
                  : needsAssistance
                    ? 'bg-amber-50/50 border-l-[3px] border-l-amber-400 hover:bg-amber-50'
                    : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
              } ${!msg.isRead && selectedId !== msg.id ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={(event) => handleCheckboxClick(event, msg, index)}
                  className={`material-symbols-outlined !text-[18px] mt-0.5 transition-colors ${
                    selectedMessageIds.has(msg.id)
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                  aria-pressed={selectedMessageIds.has(msg.id)}
                >
                  {selectedMessageIds.has(msg.id) ? 'check_box' : 'check_box_outline_blank'}
                </button>
                <span className={`material-symbols-outlined !text-[18px] mt-0.5 ${msg.channel === 'whatsapp' ? 'text-green-500' : 'text-blue-500'}`}>
                  {getChannelIcon(msg.channel)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[12px] font-semibold truncate ${!msg.isRead ? 'text-[var(--erp-text)]' : 'text-[var(--erp-text-muted)]'}`}>
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-[var(--erp-text-muted)] shrink-0">{msg.timestamp}</span>
                  </div>
                  <p className={`text-[12px] truncate mb-1 ${!msg.isRead ? 'font-medium' : ''}`}>{msg.subject}</p>
                  {msg.relativeTime ? (
                    <p className="text-[10px] text-[var(--erp-text-muted)] mb-1">{msg.relativeTime}</p>
                  ) : null}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isFollowup && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined !text-[12px]">support_agent</span>
                        FOLLOWUP
                      </span>
                    )}
                    {msg.extractedItems > 0 && (
                      <span className="text-[10px] text-[var(--erp-text-muted)]">{msg.extractedItems} items</span>
                    )}
                    {msg.status === 'new' && msg.parsingError && (
                      <span className="text-[10px] text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[10rem]">
                        {msg.parsingError.length > 60 ? `${msg.parsingError.slice(0,60)}…` : msg.parsingError}
                      </span>
                    )}
                    {(msg.retryCount || 0) > 0 && (
                      <span className="text-[10px] text-violet-700 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded">
                        Retried {msg.retryCount}x
                      </span>
                    )}
                    {isMessageRfq(msg) && msg.confidence > 0 && (
                      <span className={`text-[10px] font-medium ${getConfidenceColor(msg.confidence)}`}>
                        {msg.confidence}% conf.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
          {filteredMessages.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">inbox</span>
              <p>No messages found</p>
            </div>
          )}
        </div>
          <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          Showing {filteredMessages.length} of {inboxMessages.length} messages
        </div>
      </aside>

      {/* Main Content - Message Detail */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined !text-[24px] ${selectedMessage.channel === 'whatsapp' ? 'text-green-500' : 'text-blue-500'}`}>
                  {getChannelIcon(selectedMessage.channel)}
                </span>
                <div>
                  <h1 className="text-base font-bold text-[var(--erp-text)]">{selectedMessage.sender}</h1>
                  <p className="text-[12px] text-[var(--erp-text-muted)]">{selectedMessage.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedMessage.status === 'new' && !isMessageNotRfq(selectedMessage) && (
                  <button 
                    onClick={() => handleConvertToRFQ(selectedMessage)}
                    className="btn btn-primary btn-sm"
                  >
                    <span className="material-symbols-outlined !text-[16px]">add</span> Create RFQ
                  </button>
                )}
                <button 
                  onClick={() => setShowInlineReply(!showInlineReply)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 bg-blue-50 text-blue-700 rounded text-[12px] font-medium hover:bg-blue-100"
                >
                  <span className="material-symbols-outlined !text-[16px]">reply</span> Reply
                </button>
                <button 
                  onClick={() => handleMarkNeedsReview(selectedMessage)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 rounded text-[12px] font-medium hover:bg-amber-100"
                >
                  <span className="material-symbols-outlined !text-[16px]">flag</span> Mark Review
                </button>
                <button 
                  onClick={() => handleArchive(selectedMessage)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">archive</span> Archive
                </button>
                <button
                  onClick={() => handleRetryParsing(selectedMessage)}
                  disabled={retryingMessageId === selectedMessage.id}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Re-run RFQ parsing for this message"
                >
                  <span className={`material-symbols-outlined !text-[16px] ${retryingMessageId === selectedMessage.id ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  {retryingMessageId === selectedMessage.id ? 'Retrying...' : 'Retry Parsing'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--erp-border)] flex shrink-0">
              {[
                { id: 'raw', label: 'Raw Message', icon: 'article' },
                ...(showExtractedItemsTab ? [{ id: 'parsed', label: 'Extracted Data', icon: 'data_object' }] : []),
                ...(showAttachmentsTab ? [{ id: 'attachments', label: 'Attachments', icon: 'attach_file' }] : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--erp-accent)] text-[var(--erp-accent)] bg-blue-50/50'
                      : 'border-transparent text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Inline Reply Section */}
            {showInlineReply && selectedMessage && (
              <div className="border-b border-[var(--erp-border)] bg-blue-50/30 p-4 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold text-[var(--erp-text)] uppercase tracking-wider">
                    Quick Reply
                  </h4>
                  <button
                    onClick={() => setShowInlineReply(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined !text-[18px]">close</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--erp-text-muted)] space-y-1">
                    <div><strong>To:</strong> {selectedMessage.from || selectedMessage.sender}</div>
                    <div><strong>Subject:</strong> Re: {selectedMessage.subject}</div>
                  </div>
                  <textarea
                    value={inlineReply}
                    onChange={(e) => setInlineReply(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full h-32 border border-[var(--erp-border)] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[var(--erp-accent)] resize-none"
                    disabled={sendingInlineReply}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowInlineReply(false);
                        setInlineReply('');
                      }}
                      disabled={sendingInlineReply}
                      className="px-3 py-1.5 border border-[var(--erp-border)] rounded text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendInlineReply}
                      disabled={sendingInlineReply || !inlineReply.trim()}
                      className="btn btn-primary btn-sm"
                    >
                      {sendingInlineReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Email Thread Display */}
            {threadMessages.length > 1 && (
              <div className="border-b border-[var(--erp-border)] bg-slate-50 p-4 shrink-0">
                <h4 className="text-[12px] font-bold text-[var(--erp-text)] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined !text-[16px]">forum</span>
                  Email Thread ({threadMessages.length} messages)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadingThread ? (
                    <div className="text-center py-4 text-sm text-slate-400">
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      <p>Loading thread...</p>
                    </div>
                  ) : (
                    threadMessages.map((threadMsg, idx) => (
                      <div 
                        key={threadMsg.id}
                        className={`p-2 rounded border text-[11px] ${
                          threadMsg.id === selectedMessage?.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[var(--erp-text)]">{threadMsg.sender}</span>
                          <span className="text-[10px] text-[var(--erp-text-muted)]">{threadMsg.timestamp}</span>
                        </div>
                        <p className="text-[var(--erp-text-muted)] line-clamp-2">{threadMsg.preview || threadMsg.subject}</p>
                        {threadMsg.id === selectedMessage?.id && (
                          <span className="inline-block mt-1 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'raw' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 p-2.5 rounded border border-[var(--erp-border)]">
                      <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">From</p>
                      <p className="text-[13px] font-semibold leading-tight">{selectedMessage.sender}</p>
                      {selectedMessage.from ? (
                        <p className="text-[11px] text-[var(--erp-text-muted)] leading-tight truncate">{selectedMessage.from}</p>
                      ) : null}
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-[var(--erp-border)]">
                      <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">Received</p>
                      <p className="text-[13px] font-semibold leading-tight">{selectedMessage.timestamp}</p>
                      {selectedMessage.relativeTime ? (
                        <p className="text-[11px] text-[var(--erp-text-muted)] leading-tight">{selectedMessage.relativeTime}</p>
                      ) : null}
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-[var(--erp-border)]">
                      <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">Parsing Status</p>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined !text-[14px] text-[var(--erp-text-muted)]">
                          {parsingStatusMeta?.icon || 'info'}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 border rounded ${parsingStatusMeta?.chipClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {parsingStatusMeta?.label || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--erp-text-muted)] leading-tight">
                        {parsingStatusMeta?.detail || 'Status unavailable.'}
                      </p>
                      {(selectedMessage.retryCount || 0) > 0 ? (
                        <p className="text-[11px] text-violet-700 leading-tight mt-1">
                          Retried {selectedMessage.retryCount} time(s)
                          {selectedMessage.lastRetryAt
                            ? ` • Last: ${formatRetryTimestamp(selectedMessage.lastRetryAt)}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">Subject</h3>
                    <p className="text-sm font-medium text-[var(--erp-text)]">{selectedMessage.subject}</p>
                  </div>
                  {(selectedMessage.rfqId || selectedMessage.quotationId) && (
                    <div>
                      <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">Related Documents</h3>
                      <div className="flex gap-2 flex-wrap">
                        {selectedMessage.rfqId && (
                          <button
                            onClick={() => navigate(`/rfqs/${selectedMessage.rfqId}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-md border border-blue-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">request_quote</span>
                            View RFQ
                          </button>
                        )}
                        {selectedMessage.quotationId && (
                          <button
                            onClick={() => navigate(`/quotations/${selectedMessage.quotationId}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">description</span>
                            View Quotation
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">Message Body</h3>
                    {sanitizedHtml ? (
                      <div className="isolate relative overflow-hidden rounded border border-[var(--erp-border)] bg-white">
                        <iframe
                          title="Email content"
                          sandbox=""
                          className="block w-full bg-white"
                          style={{ minHeight: '220px', width: '100%', border: 0 }}
                          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src cid: data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none';" /><base target="_blank" /><style>
                            html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: Inter, Arial, sans-serif; }
                            body { padding: 16px; overflow-wrap: anywhere; }
                            img { max-width: 100%; height: auto; display: block; }
                            table { max-width: 100%; border-collapse: collapse; }
                            td, th { max-width: 100%; }
                            a { word-break: break-word; }
                            * { box-sizing: border-box; }
                          </style></head><body>${sanitizedHtml}</body></html>`}
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded border border-[var(--erp-border)] text-sm text-[var(--erp-text)] whitespace-pre-wrap">
                        {selectedMessage.content || selectedMessage.preview || 'No message body available.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'parsed' && showExtractedItemsTab && (
                <div className="space-y-4">
                  {selectedMessage.parsingError ? (
                    <div
                      className={`rounded border p-3 ${
                        isParsingFailureMessage(selectedMessage.parsingError)
                          ? 'border-red-200 bg-red-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-bold uppercase tracking-widest ${
                          isParsingFailureMessage(selectedMessage.parsingError)
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {isParsingFailureMessage(selectedMessage.parsingError)
                          ? 'Parsing Error'
                          : 'Parsing Note'}
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          isParsingFailureMessage(selectedMessage.parsingError)
                            ? 'text-red-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {selectedMessage.parsingError}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Source: {getParsingSourceLabel(selectedMessage.parsingSource || '')}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                        Parsing Completed
                      </p>
                      <p className="mt-1 text-sm text-emerald-800">
                        {parsingStatusMeta?.detail || 'RFQ extraction completed successfully.'}
                      </p>
                    </div>
                  )}

                  <div className={`border rounded p-3 ${parsingStatusMeta?.panelClass || 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined !text-[18px]">
                        {parsingStatusMeta?.icon || 'info'}
                      </span>
                      <p className="text-sm font-semibold">{parsingStatusMeta?.label || 'Parsing Status'}</p>
                    </div>
                    <p className="text-[12px] mt-1 opacity-90">
                      {parsingStatusMeta?.detail || 'Status unavailable.'}
                    </p>
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded border bg-white/70 border-current inline-flex items-center gap-1">
                        <span className="material-symbols-outlined !text-[14px]">
                          {parsingStatusMeta?.icon || 'info'}
                        </span>
                        {parsingStatusMeta?.label || 'Status'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {isMessageRfq(selectedMessage) ? (
                        <>
                          <span className={`text-lg font-bold ${getConfidenceColor(selectedMessage.confidence)}`}>
                            {selectedMessage.confidence}%
                          </span>
                          <span className="text-[12px] text-[var(--erp-text-muted)]">AI Confidence Score</span>
                        </>
                      ) : (
                        <span className="text-[12px] text-[var(--erp-text-muted)]">AI Confidence Score not applicable (non-RFQ email)</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">Extracted Items ({selectedMessage.extractedItems})</h3>
                    {(selectedMessage.rfqId || selectedMessage.quotationId) && (
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                        {selectedMessage.rfqId ? (
                          <span className="px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 font-medium">
                            RFQ Linked: {selectedMessage.rfqId}
                          </span>
                        ) : null}
                        {selectedMessage.quotationId ? (
                          <span className="px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 font-medium">
                            Quotation Draft: {selectedMessage.quotationId}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {parsedItems.length > 0 ? (
                      <div className="space-y-2">
                        {parsedItems.map((item, index) => (
                          <div
                            key={`${item.product_name}-${index}`}
                            className="p-3 bg-slate-50 rounded border border-[var(--erp-border)] text-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-[var(--erp-text)]">{item.product_name}</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  item.status === 'rejected'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : item.availability === 'out_of_stock'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : item.availability === 'insufficient_stock'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {(item.status || 'matched').toUpperCase()}
                                </span>
                                <p className="text-[12px] text-[var(--erp-text-muted)]">
                                  Qty: <span className="font-semibold text-[var(--erp-text)]">{item.quantity}</span>
                                  {item.unit ? ` ${item.unit}` : ''}
                                </p>
                              </div>
                            </div>
                            {item.availability === 'insufficient_stock' && typeof item.availableQuantity === 'number' ? (
                              <p className="text-[12px] text-amber-700 mt-1">
                                Only {item.availableQuantity} available right now.
                              </p>
                            ) : null}
                            {item.availability === 'out_of_stock' ? (
                              <p className="text-[12px] text-red-700 mt-1">Out of stock right now.</p>
                            ) : null}
                            {item.reason ? (
                              <p className="text-[12px] text-red-700 mt-1">{item.reason}</p>
                            ) : null}
                            {item.notes ? (
                              <p className="text-[12px] text-[var(--erp-text-muted)] mt-1">{item.notes}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : selectedMessage.extractedItems > 0 ? (
                      <div className="p-4 bg-slate-50 rounded border border-[var(--erp-border)] text-sm text-[var(--erp-text)]">
                        {selectedMessage.extractedItems} line items were detected in this message.
                        <div className="text-[12px] text-[var(--erp-text-muted)] mt-1">
                          Detailed parsed line-item fields are not available in this payload.
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded border border-[var(--erp-border)]">
                        <span className="material-symbols-outlined text-2xl mb-2">search_off</span>
                        <p>No items could be extracted</p>
                      </div>
                    )}
                  </div>

                  {(selectedMessage.retryHistory || []).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">
                        Latest Retry
                      </h3>
                      {(selectedMessage.retryHistory || []).slice(0, 1).map((entry, index) => (
                        <div
                          key={`${entry.retried_at}-${index}`}
                          className="p-3 bg-violet-50 rounded border border-violet-200 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-violet-800">
                              Retry #{Math.max((selectedMessage.retryCount || 0) - index, 1)}
                            </p>
                            <p className="text-[11px] text-violet-700">
                              {formatRetryTimestamp(entry.retried_at)}
                            </p>
                          </div>
                          <p className="text-[12px] text-violet-800 mt-1">{entry.reason}</p>
                          <p className="text-[11px] text-violet-700 mt-1">
                            Previous status: {entry.previous_processing_status}
                            {typeof entry.previous_item_count === 'number'
                              ? ` • Previous items: ${entry.previous_item_count}`
                              : ''}
                            {entry.forced ? ' • Forced retry' : ''}
                          </p>
                          {entry.previous_parsing_error ? (
                            <p className="text-[11px] text-violet-700 mt-1">
                              Previous error: {entry.previous_parsing_error}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleConvertToRFQ(selectedMessage)}
                      disabled={
                          (parsedItems.length <= 0 && extractItemsFromRawText(selectedMessage.content || selectedMessage.preview || '').length <= 0) ||
                        selectedMessage.status === 'duplicate' ||
                        selectedMessage.autoRfqCreated ||
                          Boolean(selectedMessage.rfqId)
                      }
                      className="btn btn-primary btn-md"
                    >
                      <span className="material-symbols-outlined !text-[16px]">add</span>
                      {selectedMessage.autoRfqCreated
                        ? 'RFQ Already Auto-Created'
                        : selectedMessage.rfqId
                          ? 'RFQ Already Linked'
                        : isMessageNotRfq(selectedMessage)
                          ? 'Force Create RFQ'
                          : 'Create RFQ from Extracted Data'}
                    </button>
                    <button
                      onClick={() => handleEditExtractedData(selectedMessage)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined !text-[16px]">edit</span>
                      Edit Extracted Data
                    </button>
                    <button
                      onClick={() => handleOpenCompose(selectedMessage)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50"
                      title="Send a direct email response"
                    >
                      <span className="material-symbols-outlined !text-[16px]">mail</span>
                      Send Email
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'attachments' && showAttachmentsTab && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest mb-2">Attachments</h3>
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMessage.attachments.map((attachment, index) => (
                        <div key={`${attachment}-${index}`} className="flex items-center gap-3 p-3 border border-[var(--erp-border)] rounded">
                          <span className="material-symbols-outlined !text-[24px] text-slate-500">attach_file</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment}</p>
                            <p className="text-[11px] text-[var(--erp-text-muted)]">Attachment metadata unavailable</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded border border-[var(--erp-border)]">
                      <span className="material-symbols-outlined text-2xl mb-2">attach_file_off</span>
                      <p>No attachments available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">inbox</span>
              <p className="text-sm">Select a message to view details</p>
            </div>
          </div>
        )}
      </main>
        </div>
      </div>

      {pendingCreatePreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--erp-border)] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--erp-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--erp-text)]">Review Extracted Lines</h3>
                <p className="text-[12px] text-[var(--erp-text-muted)]">
                  {pendingCreatePreview.message.subject}
                </p>
              </div>
              <button
                onClick={() => setPendingCreatePreview(null)}
                disabled={creatingFromPreview}
                className="rounded p-1 text-[var(--erp-text-muted)] hover:bg-slate-100 disabled:opacity-50"
                title="Close"
              >
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div className="rounded border border-green-200 bg-green-50 p-3">
                <p className="text-[12px] font-semibold text-green-700">
                  Matched ({pendingCreatePreview.preview.matched_items.length})
                </p>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[12px]">
                  {pendingCreatePreview.preview.matched_items.length > 0 ? (
                    pendingCreatePreview.preview.matched_items.map((item, index) => (
                      <div key={`${item.product_name || item.name || 'item'}-${index}`} className="rounded border border-green-200 bg-white px-2 py-1">
                        {(item.product_name || item.name || 'Unknown item')} - {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-green-700">No valid catalog matches.</p>
                  )}
                </div>
              </div>

              <div className="rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-[12px] font-semibold text-amber-700">
                  Rejected ({pendingCreatePreview.preview.unmatched_items.length})
                </p>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[12px]">
                  {pendingCreatePreview.preview.unmatched_items.length > 0 ? (
                    pendingCreatePreview.preview.unmatched_items.map((item, index) => (
                      <div key={`${item.input_name || 'rejected'}-${index}`} className="rounded border border-amber-200 bg-white px-2 py-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{(item.input_name || 'Unnamed line')}</div>
                            <div className="text-[11px] text-[var(--erp-text-muted)]">{item.reason.replaceAll('_', ' ')}</div>
                          </div>
                        </div>
                        {/* Show intelligence suggestions if provided in preview */}
                        {pendingCreatePreview.preview.item_intelligence_suggestions?.length ? (
                          <div className="mt-2 text-[12px]">
                            {(() => {
                              const s = pendingCreatePreview.preview.item_intelligence_suggestions?.find((si) => si.input_text === (item.input_name || ''));
                              if (!s) return null;
                              return (
                                <div className="mt-1">
                                  <div className="text-[12px] font-semibold">Suggestions</div>
                                  {s.suggestions.map((cand: any, ci: number) => (
                                    <div key={ci} className="flex items-center justify-between rounded border px-2 py-1 mt-1">
                                      <div className="text-[12px]">{cand.product_name} {cand.product_id ? `(${cand.product_id})` : ''}</div>
                                      <div className="flex gap-2">
                                        <button
                                          className="text-[12px] text-green-600"
                                          onClick={async () => {
                                            try {
                                              await postItemIntelligenceFeedback({
                                                tenant_id: user?.tenant_id,
                                                input_id: item.input_name,
                                                chosen_candidate_id: cand.product_id,
                                                accepted: true,
                                              });
                                              showToast('Accepted suggestion', 'success');
                                            } catch (e: any) {
                                              showToast(e.message || 'Failed to send feedback', 'error');
                                            }
                                          }}
                                        >
                                          Accept
                                        </button>
                                        <button
                                          className="text-[12px] text-red-600"
                                          onClick={async () => {
                                            try {
                                              await postItemIntelligenceFeedback({
                                                tenant_id: user?.tenant_id,
                                                input_id: item.input_name,
                                                chosen_candidate_id: cand.product_id,
                                                accepted: false,
                                              });
                                              showToast('Rejected suggestion', 'success');
                                            } catch (e: any) {
                                              showToast(e.message || 'Failed to send feedback', 'error');
                                            }
                                          }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-amber-700">No rejected lines.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--erp-border)] px-4 py-3">
              <p className="text-[11px] text-[var(--erp-text-muted)]">
                Candidate lines: {pendingCreatePreview.candidateItems.length} • {pendingCreatePreview.preview.summary}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingCreatePreview(null)}
                  disabled={creatingFromPreview}
                  className="rounded border border-[var(--erp-border)] px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreateFromPreview}
                  disabled={creatingFromPreview || pendingCreatePreview.preview.matched_items.length === 0}
                  className="btn btn-primary btn-md"
                >
                  {creatingFromPreview ? 'Creating...' : 'Create RFQ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showComposeModal && selectedMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--erp-border)] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--erp-border)] px-4 py-3">
              <h3 className="text-sm font-bold text-[var(--erp-text)]">Compose Email</h3>
              <button
                onClick={handleCloseCompose}
                disabled={composing}
                className="rounded p-1 text-[var(--erp-text-muted)] hover:bg-slate-100 disabled:opacity-50"
                title="Close"
              >
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-widest">
                  To
                </label>
                <input
                  type="email"
                  disabled={composing}
                  placeholder="recipient@example.com"
                  className="mt-1 w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)]"
                  value={composeForm.to.join(', ')}
                  onChange={(e) =>
                    setComposeForm({
                      ...composeForm,
                      to: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-widest">
                  CC
                </label>
                <input
                  type="email"
                  disabled={composing}
                  placeholder="cc@example.com (optional)"
                  className="mt-1 w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)]"
                  value={composeForm.cc.join(', ')}
                  onChange={(e) =>
                    setComposeForm({
                      ...composeForm,
                      cc: e.target.value.split(',').map(c => c.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-widest">
                  Subject
                </label>
                <input
                  type="text"
                  disabled={composing}
                  placeholder="Email subject"
                  className="mt-1 w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)]"
                  value={composeForm.subject}
                  onChange={(e) =>
                    setComposeForm({
                      ...composeForm,
                      subject: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-widest">
                  Message
                </label>
                <textarea
                  disabled={composing}
                  placeholder="Email body..."
                  className="mt-1 w-full h-64 rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)] font-mono"
                  value={composeForm.body}
                  onChange={(e) =>
                    setComposeForm({
                      ...composeForm,
                      body: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--erp-border)] px-4 py-3">
              <p className="text-[11px] text-[var(--erp-text-muted)]">
                Sending as: {composeForm.to.length} recipient(s)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseCompose}
                  disabled={composing}
                  className="rounded border border-[var(--erp-border)] px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={composing || !composeForm.to.length || !composeForm.body.trim()}
                  className="btn btn-primary btn-md"
                >
                  {composing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
};

export default Inbox;
