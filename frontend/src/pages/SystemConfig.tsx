import React, { useMemo, useState, useEffect } from 'react';
import PageLayout from '../components/common/PageLayout';
import { PromptModal } from '../components/common/Modals';
import { CompanySettings, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { EmailIntegrations } from '../components/EmailIntegrations';
import { DataImport } from '../components/DataImport';
import IntegrationImport from '../components/IntegrationImport';
import EmailTemplatesContent from '../components/EmailTemplatesContent';
import { apiRequest } from '../services/api';

type ConfigTab =
  | 'company'
  | 'communication'
  | 'processing'
  | 'whatsapp'
  | 'notifications'
  | 'email-templates'
  | 'integrations'
  | 'currency'
  | 'billing'
  | 'ai';

const tabs: { id: ConfigTab; label: string; icon: string }[] = [
  { id: 'company', label: 'Company', icon: 'business' },
  { id: 'communication', label: 'Email', icon: 'mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { id: 'ai', label: 'AI & Automation', icon: 'psychology' },
  { id: 'processing', label: 'Queue Settings', icon: 'memory' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'email-templates', label: 'Email Templates', icon: 'mail_outline' },
  { id: 'integrations', label: 'Integrations', icon: 'hub' },
  { id: 'currency', label: 'Currency', icon: 'currency_exchange' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
];

const COMPANY_DISPLAY_NAME_EVENT = 'quotebot-company-display-name-changed';

type CompanyProfileForm = {
  displayName: string;
  legalName: string;
  tradingName: string;
  currency: string;
  logoUrl: string;
  email: string;
  phone: string;
  website: string;
  gstin: string;
  pan: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  invoicePrefix: string;
  fiscalYearStart: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
};

type ProcessingSettingsForm = {
  interval_ms: string;
  run_batch_limit: string;
  classifier_batch_size: string;
  classifier_batch_max_bytes: string;
  extraction_delay_ms: string;
  llm_rate_limit_per_minute: string;
};

const buildProcessingSettingsForm = (
  settings?: Partial<ProcessingSettingsForm> | null,
): ProcessingSettingsForm => ({
  interval_ms: settings?.interval_ms || '20000',
  run_batch_limit: settings?.run_batch_limit || '60',
  classifier_batch_size: settings?.classifier_batch_size || '8',
  classifier_batch_max_bytes: settings?.classifier_batch_max_bytes || '26000',
  extraction_delay_ms: settings?.extraction_delay_ms || '50',
  llm_rate_limit_per_minute: settings?.llm_rate_limit_per_minute || '10',
});

const buildCompanyProfileForm = (
  fallbackName: string,
  settings: CompanySettings,
): CompanyProfileForm => {
  const profile = settings.profile;

  return {
    displayName: profile?.displayName || settings.displayName || fallbackName,
    legalName: profile?.legalName || fallbackName,
    tradingName: profile?.tradingName || '',
    currency: settings.currency || 'INR',
    logoUrl: settings.logoUrl || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    website: profile?.website || '',
    gstin: profile?.gstin || '',
    pan: profile?.pan || '',
    addressLine1: profile?.addressLine1 || '',
    addressLine2: profile?.addressLine2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    country: profile?.country || 'India',
    pincode: profile?.pincode || '',
    invoicePrefix: profile?.invoicePrefix || 'INV',
    fiscalYearStart: profile?.fiscalYearStart || 'April',
    bankName: profile?.bankName || '',
    bankAccountName: profile?.bankAccountName || '',
    bankAccountNumber: profile?.bankAccountNumber || '',
    bankIfsc: profile?.bankIfsc || '',
  };
};

/* ──────────────────────────────────────────────────────────────────
   WhatsApp Settings Panel
────────────────────────────────────────────────────────────────── */
interface WhatsAppAccountItem {
  id: string;
  client_type: string;
  phone_number?: string;
  display_name?: string;
  is_active: boolean;
  meta_phone_number_id?: string;
  last_connected_at?: string;
}

const WhatsAppSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<WhatsAppAccountItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [connectingBaileys, setConnectingBaileys] = useState(false);

  const loadAccounts = React.useCallback(async () => {
    try {
      const data = await apiRequest<WhatsAppAccountItem[]>('/whatsapp/meta/accounts');
      setAccounts(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const connectBaileys = async () => {
    setConnectingBaileys(true);
    try {
      const res = await apiRequest<{ accountId: string }>('/whatsapp/baileys/connect', { method: 'POST' });
      // Listen for QR via WebSocket (handled globally) or poll
      const pollQr = async () => {
        const qrRes = await apiRequest<{ qr: string | null; status: string }>(`/whatsapp/baileys/qr/${res.accountId}`);
        if (qrRes.qr) setQrData(qrRes.qr);
        else if (qrRes.status === 'connected') { setConnectingBaileys(false); void loadAccounts(); }
        else setTimeout(() => { void pollQr(); }, 2000);
      };
      void pollQr();
    } catch { setConnectingBaileys(false); }
  };

  const disconnect = async (accountId: string, type: string) => {
    try {
      if (type === 'baileys') await apiRequest(`/whatsapp/baileys/disconnect/${accountId}`, { method: 'DELETE' });
      else await apiRequest(`/whatsapp/meta/disconnect/${accountId}`, { method: 'DELETE' });
      void loadAccounts();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--palette-deep-space)' }}>WhatsApp Integration</h2>
        <p className="text-[13px]" style={{ color: 'rgba(0,23,31,0.55)' }}>Connect WhatsApp to receive and process RFQs via messages.</p>
      </div>

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,23,31,0.4)' }}>Connected Accounts</h3>
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'rgba(0,52,89,0.12)', background: 'rgba(0,52,89,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${acc.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--palette-deep-space)' }}>
                      {acc.client_type === 'baileys' ? 'Baileys (Personal)' : 'Meta Business'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(0,23,31,0.45)' }}>
                      {acc.phone_number || acc.meta_phone_number_id || 'Connecting...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void disconnect(acc.id, acc.client_type)}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  style={{ borderColor: 'rgba(0,52,89,0.15)', color: 'rgba(0,23,31,0.5)' }}
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code display */}
      {qrData && (
        <div className="p-5 rounded-2xl border text-center" style={{ borderColor: 'rgba(0,126,167,0.3)', background: 'rgba(0,126,167,0.04)' }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--palette-deep-space)' }}>Scan with WhatsApp</p>
          <img src={qrData} alt="WhatsApp QR" className="w-48 h-48 mx-auto rounded-xl" />
          <p className="text-[11px] mt-3" style={{ color: 'rgba(0,23,31,0.45)' }}>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
        </div>
      )}

      {/* Connect buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => void connectBaileys()}
          disabled={connectingBaileys}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[13px] border transition-all hover:shadow-md disabled:opacity-50"
          style={{ borderColor: 'rgba(0,52,89,0.2)', color: 'var(--palette-deep-space)', background: 'var(--palette-white)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#25D366' }}>qr_code</span>
          {connectingBaileys ? 'Connecting...' : 'Connect via Baileys (Quick)'}
        </button>
        <a
          href="/api/whatsapp/meta/auth"
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[13px] border transition-all hover:shadow-md"
          style={{ borderColor: 'rgba(0,52,89,0.2)', color: 'var(--palette-deep-space)', background: 'var(--palette-white)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#1877F2' }}>business</span>
          Connect via Meta (Business)
        </a>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   AI & Automation Settings Panel
────────────────────────────────────────────────────────────────── */
const AISettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<{
    semantic_reranker_enabled: boolean;
    semantic_weight: number;
    suggestion_threshold: number;
    auto_accept_threshold: number;
    mode: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void apiRequest<{
      semantic_reranker_enabled?: boolean;
      semantic_weight?: number;
      suggestion_threshold?: number;
      auto_accept_threshold?: number;
      mode?: string;
    }>('/settings/item-match-config').then((d) => {
      setConfig({
        semantic_reranker_enabled: d.semantic_reranker_enabled ?? false,
        semantic_weight: d.semantic_weight ?? 0.5,
        suggestion_threshold: d.suggestion_threshold ?? 0.8,
        auto_accept_threshold: d.auto_accept_threshold ?? 0.92,
        mode: d.mode ?? 'manual',
      });
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await apiRequest('/settings/item-match-config', { method: 'PUT', body: JSON.stringify(config), headers: { 'Content-Type': 'application/json' } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!config) return <div className="text-[13px] text-[var(--erp-text-muted)]">Loading AI settings...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--palette-deep-space)' }}>AI & Automation</h2>
        <p className="text-[13px]" style={{ color: 'rgba(0,23,31,0.55)' }}>Configure AI matching and classification settings.</p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'rgba(0,52,89,0.12)' }}>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--palette-deep-space)' }}>Semantic Reranker</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(0,23,31,0.45)' }}>Use AI embeddings to improve product matching accuracy</p>
          </div>
          <button
            onClick={() => setConfig((c) => c ? { ...c, semantic_reranker_enabled: !c.semantic_reranker_enabled } : c)}
            className={`relative w-11 h-6 rounded-full transition-colors ${config.semantic_reranker_enabled ? 'bg-[var(--palette-cerulean)]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.semantic_reranker_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {config.semantic_reranker_enabled && (
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'rgba(0,52,89,0.12)' }}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold" style={{ color: 'var(--palette-deep-space)' }}>Semantic Weight</label>
                <span className="text-[12px] font-bold" style={{ color: 'var(--palette-cerulean)' }}>{config.semantic_weight.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={config.semantic_weight}
                onChange={(e) => setConfig((c) => c ? { ...c, semantic_weight: parseFloat(e.target.value) } : c)}
                className="w-full accent-[var(--palette-cerulean)]"
              />
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'rgba(0,52,89,0.12)' }}>
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'rgba(0,23,31,0.4)' }}>Matching Mode</p>
          <div className="flex gap-2">
            {['manual', 'suggest', 'auto'].map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig((c) => c ? { ...c, mode } : c)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-colors capitalize border ${config.mode === mode ? 'text-white border-transparent' : 'border-gray-200 text-[var(--erp-text-muted)]'}`}
                style={config.mode === mode ? { background: 'var(--palette-cerulean)' } : {}}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--palette-cerulean)', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save AI Settings'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SystemConfig: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const {
    companySettings,
    notificationSettings,
    updateCompanySettings,
    updateNotificationSettings,
    showToast,
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ConfigTab>('company');
  const [isSaving, setIsSaving] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    xero?: { status: string; updated_at?: string } | null;
    quickbooks?: { status: string; updated_at?: string } | null;
  }>({});
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importProvider, setImportProvider] = useState<'zoho' | 'odoo'>('zoho');
  const [showOdooModal, setShowOdooModal] = useState(false);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [processingForm, setProcessingForm] = useState<ProcessingSettingsForm>(() =>
    buildProcessingSettingsForm(),
  );
  const [savedProcessingForm, setSavedProcessingForm] = useState<ProcessingSettingsForm>(() =>
    buildProcessingSettingsForm(),
  );

  const [companyForm, setCompanyForm] = useState<CompanyProfileForm>(() =>
    buildCompanyProfileForm(user?.company_name || 'Quotebot', companySettings),
  );
  const [savedCompanyForm, setSavedCompanyForm] = useState<CompanyProfileForm>(() =>
    buildCompanyProfileForm(user?.company_name || 'Quotebot', companySettings),
  );

  const persistedCompanyForm = useMemo(
    () => buildCompanyProfileForm(user?.company_name || 'Quotebot', companySettings),
    [companySettings, user?.company_name],
  );

  const [notificationForm, setNotificationForm] = useState({
    newRfq: notificationSettings.newRfq,
    quoteSent: notificationSettings.quoteSent,
    quoteViewed: notificationSettings.quoteViewed,
    quoteAccepted: notificationSettings.quoteAccepted,
    quoteDeclined: notificationSettings.quoteDeclined,
  });

  const [itemIntelligenceForm, setItemIntelligenceForm] = useState({
    semantic_reranker_enabled: false,
    semantic_weight: 0.5,
  });
  const [savedItemIntelligenceForm, setSavedItemIntelligenceForm] = useState({
    semantic_reranker_enabled: false,
    semantic_weight: 0.5,
  });

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'processing' || isAdmin),
    [isAdmin],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (activeTab === 'company') {
      return JSON.stringify(companyForm) !== JSON.stringify(savedCompanyForm);
    }

    if (activeTab === 'notifications') {
      return (
        notificationForm.newRfq !== notificationSettings.newRfq ||
        notificationForm.quoteSent !== notificationSettings.quoteSent ||
        notificationForm.quoteViewed !== notificationSettings.quoteViewed ||
        notificationForm.quoteAccepted !== notificationSettings.quoteAccepted ||
        notificationForm.quoteDeclined !== notificationSettings.quoteDeclined
      );
    }

    if (activeTab === 'processing') {
      return (
        JSON.stringify(processingForm) !== JSON.stringify(savedProcessingForm) ||
        JSON.stringify(itemIntelligenceForm) !== JSON.stringify(savedItemIntelligenceForm)
      );
    }

    return false;
  }, [
    activeTab,
    companyForm,
    savedCompanyForm,
    notificationForm,
    notificationSettings,
    processingForm,
    savedProcessingForm,
    itemIntelligenceForm,
    savedItemIntelligenceForm,
  ]);

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      showToast('No changes to save', 'info');
      return;
    }

    setIsSaving(true);

    try {
      if (activeTab === 'company') {
        await updateCompanySettings({
          currency: companyForm.currency,
          logoUrl: companyForm.logoUrl,
          profile: {
            displayName: companyForm.displayName,
            legalName: companyForm.legalName,
            tradingName: companyForm.tradingName,
            email: companyForm.email,
            phone: companyForm.phone,
            website: companyForm.website,
            gstin: companyForm.gstin,
            pan: companyForm.pan,
            addressLine1: companyForm.addressLine1,
            addressLine2: companyForm.addressLine2,
            city: companyForm.city,
            state: companyForm.state,
            country: companyForm.country,
            pincode: companyForm.pincode,
            invoicePrefix: companyForm.invoicePrefix,
            fiscalYearStart: companyForm.fiscalYearStart,
            bankName: companyForm.bankName,
            bankAccountName: companyForm.bankAccountName,
            bankAccountNumber: companyForm.bankAccountNumber,
            bankIfsc: companyForm.bankIfsc,
          },
        });
        window.dispatchEvent(new Event(COMPANY_DISPLAY_NAME_EVENT));
        setSavedCompanyForm(companyForm);
      }

      if (activeTab === 'notifications') {
        await updateNotificationSettings({
          newRfq: notificationForm.newRfq,
          quoteSent: notificationForm.quoteSent,
          quoteViewed: notificationForm.quoteViewed,
          quoteAccepted: notificationForm.quoteAccepted,
          quoteDeclined: notificationForm.quoteDeclined,
        });
      }

      if (activeTab === 'processing') {
        const processingPayload = {
          interval_ms: Number(processingForm.interval_ms),
          run_batch_limit: Number(processingForm.run_batch_limit),
          classifier_batch_size: Number(processingForm.classifier_batch_size),
          classifier_batch_max_bytes: Number(processingForm.classifier_batch_max_bytes),
          extraction_delay_ms: Number(processingForm.extraction_delay_ms),
          llm_rate_limit_per_minute: Number(processingForm.llm_rate_limit_per_minute),
        };

        const itemIntelPayload = {
          semantic_reranker_enabled: itemIntelligenceForm.semantic_reranker_enabled,
          semantic_weight: itemIntelligenceForm.semantic_weight,
        };

        await Promise.all([
          apiRequest('/admin/processing-settings', {
            method: 'PUT',
            body: JSON.stringify(processingPayload),
          }),
          apiRequest(`/item-intelligence/config?tenant_id=${user?.tenant_id}`, {
            method: 'PUT',
            body: JSON.stringify(itemIntelPayload),
          }),
        ]);

        setSavedProcessingForm(processingForm);
        setSavedItemIntelligenceForm(itemIntelligenceForm);
      }

      showToast('Settings saved successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save settings',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!hasUnsavedChanges) {
      return;
    }

    setCompanyForm(persistedCompanyForm);
    setSavedCompanyForm(persistedCompanyForm);

    setNotificationForm({
      newRfq: notificationSettings.newRfq,
      quoteSent: notificationSettings.quoteSent,
      quoteViewed: notificationSettings.quoteViewed,
      quoteAccepted: notificationSettings.quoteAccepted,
      quoteDeclined: notificationSettings.quoteDeclined,
    });

    setProcessingForm(savedProcessingForm);
    setItemIntelligenceForm(savedItemIntelligenceForm);

    showToast('Changes discarded', 'info');
  };

  useEffect(() => {
    if (activeTab !== 'integrations') {
      return;
    }

    const loadStatus = async () => {
      setIntegrationsLoading(true);
      try {
        const status = await apiRequest('/integrations/accounting/status');
        setIntegrationStatus(status as typeof integrationStatus);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to load integration status',
          'error',
        );
      } finally {
        setIntegrationsLoading(false);
      }
    };

    void loadStatus();
  }, [activeTab, showToast]);

  useEffect(() => {
    if (activeTab !== 'processing' || !isAdmin) {
      return;
    }

    const loadProcessingSettings = async () => {
      setProcessingLoading(true);
      try {
        const [settings, itemIntelConfig] = await Promise.all([
          apiRequest<{
            interval_ms: number;
            run_batch_limit: number;
            classifier_batch_size: number;
            classifier_batch_max_bytes: number;
            extraction_delay_ms: number;
            llm_rate_limit_per_minute: number;
          }>('/admin/processing-settings'),
          apiRequest<any>(`/item-intelligence/config?tenant_id=${user?.tenant_id}`).catch(() => null),
        ]);

        const nextForm = buildProcessingSettingsForm({
          interval_ms: String(settings?.interval_ms ?? 20000),
          run_batch_limit: String(settings?.run_batch_limit ?? 60),
          classifier_batch_size: String(settings?.classifier_batch_size ?? 8),
          classifier_batch_max_bytes: String(settings?.classifier_batch_max_bytes ?? 26000),
          extraction_delay_ms: String(settings?.extraction_delay_ms ?? 50),
          llm_rate_limit_per_minute: String(settings?.llm_rate_limit_per_minute ?? 10),
        });
        setProcessingForm(nextForm);
        setSavedProcessingForm(nextForm);

        if (itemIntelConfig) {
          setItemIntelligenceForm({
            semantic_reranker_enabled: itemIntelConfig.semantic_reranker_enabled || false,
            semantic_weight: Number(itemIntelConfig.semantic_weight) || 0.5,
          });
          setSavedItemIntelligenceForm({
            semantic_reranker_enabled: itemIntelConfig.semantic_reranker_enabled || false,
            semantic_weight: Number(itemIntelConfig.semantic_weight) || 0.5,
          });
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to load processing settings',
          'error',
        );
      } finally {
        setProcessingLoading(false);
      }
    };

    void loadProcessingSettings();
  }, [activeTab, isAdmin, user?.tenant_id, showToast]);

  useEffect(() => {
    setCompanyForm(persistedCompanyForm);
    setSavedCompanyForm(persistedCompanyForm);
  }, [persistedCompanyForm]);

  const renderCompanyContent = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--erp-text)]">Company Profile</h1>
        <p className="text-sm text-[var(--erp-text-muted)]">
          Brand, identity, and billing defaults used across Quotebot.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--erp-border)] bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--erp-text)]">Selected display name</h3>
            <p className="text-[12px] text-[var(--erp-text-muted)]">
              This is the company name shown in the header and document branding.
            </p>
          </div>
          <div className="rounded-full border border-[var(--erp-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--erp-accent)]">
            {companyForm.displayName || user?.company_name || 'Quotebot'}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { key: 'displayName', label: 'Display Name', placeholder: 'Quotebot Enterprises Pvt. Ltd.' },
          { key: 'legalName', label: 'Legal Name', placeholder: 'Registered legal entity name' },
          { key: 'tradingName', label: 'Trading Name', placeholder: 'Optional trading / brand name' },
          { key: 'email', label: 'Primary Email', placeholder: 'accounts@company.com', type: 'email' },
          { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
          { key: 'website', label: 'Website', placeholder: 'https://company.com' },
          { key: 'gstin', label: 'GSTIN', placeholder: '27AABCA1234A1ZA' },
          { key: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
          { key: 'addressLine1', label: 'Address Line 1', placeholder: 'Building / street / area' },
          { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Suite / landmark / floor' },
          { key: 'city', label: 'City', placeholder: 'Mumbai' },
          { key: 'state', label: 'State', placeholder: 'Maharashtra' },
          { key: 'country', label: 'Country', placeholder: 'India' },
          { key: 'pincode', label: 'Pincode', placeholder: '400001' },
          { key: 'invoicePrefix', label: 'Invoice Prefix', placeholder: 'INV' },
          { key: 'fiscalYearStart', label: 'Fiscal Year Start', placeholder: 'April' },
          { key: 'bankName', label: 'Bank Name', placeholder: 'HDFC Bank' },
          { key: 'bankAccountName', label: 'Account Holder Name', placeholder: 'Company account name' },
          { key: 'bankAccountNumber', label: 'Account Number', placeholder: '000123456789' },
          { key: 'bankIfsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
        ].map((field) => (
          <section key={field.key} className={field.key === 'addressLine1' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
            <label className="block text-sm text-[var(--erp-text-muted)] font-medium">
              {field.label}
            </label>
            {field.key === 'fiscalYearStart' ? (
              <select
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                value={companyForm.fiscalYearStart}
                onChange={(event) => setCompanyForm((prev) => ({ ...prev, fiscalYearStart: event.target.value }))}
              >
                <option value="January">January</option>
                <option value="April">April</option>
                <option value="July">July</option>
                <option value="October">October</option>
              </select>
            ) : field.key === 'country' ? (
              <input
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
                placeholder={field.placeholder}
                value={companyForm.country}
                onChange={(event) => setCompanyForm((prev) => ({ ...prev, country: event.target.value }))}
              />
            ) : (
              <input
                type={(field as any).type || 'text'}
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
                placeholder={field.placeholder}
                value={companyForm[field.key as keyof typeof companyForm] as string}
                onChange={(event) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
              />
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <label className="block text-sm text-[var(--erp-text-muted)] font-medium">Currency</label>
          <select
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
            value={companyForm.currency}
            onChange={(event) => setCompanyForm((prev) => ({ ...prev, currency: event.target.value }))}
          >
            <option value="INR">INR (₹) - Indian Rupee</option>
            <option value="USD">USD ($) - US Dollar</option>
            <option value="EUR">EUR (€) - Euro</option>
            <option value="GBP">GBP (£) - British Pound</option>
          </select>
        </section>

        <section className="space-y-3">
          <label className="block text-sm text-[var(--erp-text-muted)] font-medium">Logo URL</label>
          <input
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
            placeholder="https://example.com/logo.png"
            value={companyForm.logoUrl}
            onChange={(event) => setCompanyForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
          />
        </section>
      </div>

      <section className="rounded-xl border border-[var(--erp-border)] bg-white p-4 text-sm text-[var(--erp-text-muted)]">
        Company profile values are persisted in backend settings and used as ERP-wide branding defaults.
      </section>
    </div>
  );

  const renderNotificationsContent = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--erp-text)]">Notification Settings</h1>
        <p className="text-sm text-[var(--erp-text-muted)]">
          Connected to backend notification preferences.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { key: 'newRfq', label: 'New RFQ received' },
          { key: 'quoteSent', label: 'Quote sent successfully' },
          { key: 'quoteViewed', label: 'Quote viewed by client' },
          { key: 'quoteAccepted', label: 'Quote accepted' },
          { key: 'quoteDeclined', label: 'Quote declined' },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationForm[item.key as keyof typeof notificationForm]}
              onChange={(event) =>
                setNotificationForm((prev) => ({
                  ...prev,
                  [item.key]: event.target.checked,
                }))
              }
              className="rounded border-[var(--erp-border)] text-[var(--erp-accent)]"
            />
            <span className="text-sm text-[var(--erp-text)]">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderProcessingContent = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--erp-text)]">Automation & Item Intelligence</h1>
        <p className="text-sm text-[var(--erp-text-muted)]">
          Control the global email queue, batching, LLM throughput limits, and item matching configuration.
        </p>
      </div>

      {/* Processing Section */}
      <div>
        <h2 className="text-md font-bold mb-2 text-[var(--erp-text)]">Email Processing</h2>
        <section className="rounded-2xl border border-[var(--erp-border)] bg-slate-50 p-4 text-sm text-[var(--erp-text-muted)] mb-4">
          These settings are global defaults with env fallback. They affect the shared classifier and extraction worker.
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { key: 'interval_ms', label: 'Worker interval (ms)', helper: 'How often the worker wakes up.' },
            { key: 'run_batch_limit', label: 'Run batch limit', helper: 'Max messages processed per run.' },
            { key: 'classifier_batch_size', label: 'Classifier batch size', helper: 'How many messages the router classifies together.' },
            { key: 'classifier_batch_max_bytes', label: 'Classifier max bytes', helper: 'Byte cap per classifier batch.' },
            { key: 'extraction_delay_ms', label: 'Extraction delay (ms)', helper: 'Small delay between extraction calls.' },
            { key: 'llm_rate_limit_per_minute', label: 'LLM calls per minute', helper: 'Global provider safety limit.' },
          ].map((field) => (
            <section key={field.key} className="space-y-2 rounded-xl border border-[var(--erp-border)] bg-white p-4">
              <label className="block text-sm font-medium text-[var(--erp-text-muted)]">{field.label}</label>
              <input
                type="number"
                min={field.key === 'extraction_delay_ms' ? 0 : 1}
                step={1}
                value={processingForm[field.key as keyof ProcessingSettingsForm]}
                onChange={(event) =>
                  setProcessingForm((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
                className="w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm"
                disabled={processingLoading}
              />
              <p className="text-[12px] text-[var(--erp-text-muted)]">{field.helper}</p>
            </section>
          ))}
        </div>
      </div>

      {/* Item Intelligence Section */}
      <div className="pt-4 border-t border-[var(--erp-border)]">
        <h2 className="text-md font-bold mb-2 text-[var(--erp-text)]">Item Matching</h2>
        <section className="rounded-2xl border border-[var(--erp-border)] bg-slate-50 p-4 text-sm text-[var(--erp-text-muted)] mb-4">
          Configure intelligent matching for RFQ line items. Enable semantic reranking to improve matching accuracy for synonyms and conceptually similar terms.
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-[var(--erp-border)] bg-white p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={itemIntelligenceForm.semantic_reranker_enabled}
                onChange={(event) =>
                  setItemIntelligenceForm((prev) => ({
                    ...prev,
                    semantic_reranker_enabled: event.target.checked,
                  }))
                }
                className="rounded border-[var(--erp-border)] text-[var(--erp-accent)]"
                disabled={itemIntelligenceLoading}
              />
              <div>
                <span className="text-sm font-medium text-[var(--erp-text)]">Enable Semantic Reranker</span>
                <p className="text-[12px] text-[var(--erp-text-muted)]">Uses AI embeddings to improve matching for similar terms</p>
              </div>
            </label>

            {itemIntelligenceForm.semantic_reranker_enabled && (
              <div className="ml-6 space-y-2 pt-2 border-t border-[var(--erp-border)]">
                <label className="block text-sm font-medium text-[var(--erp-text-muted)]">
                  Semantic Weight: {(itemIntelligenceForm.semantic_weight * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={itemIntelligenceForm.semantic_weight * 100}
                  onChange={(event) =>
                    setItemIntelligenceForm((prev) => ({
                      ...prev,
                      semantic_weight: Number(event.target.value) / 100,
                    }))
                  }
                  className="w-full"
                  disabled={itemIntelligenceLoading}
                />
                <p className="text-[12px] text-[var(--erp-text-muted)]">
                  Balance between fuzzy text matching (0%) and semantic AI matching (100%). 50% = equal weight.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  const renderStaticContent = (title: string, description: string) => (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-[var(--erp-text)]">{title}</h1>
      <p className="text-sm text-[var(--erp-text-muted)]">{description}</p>
      <div className="p-4 border border-[var(--erp-border)] rounded bg-slate-50 text-sm text-[var(--erp-text-muted)]">
        This tab is available in the UI and can be connected to additional backend modules when ready.
      </div>
    </div>
  );

  const handleAuthorize = async (provider: 'xero' | 'quickbooks') => {
    try {
      const payload = await apiRequest<{ authorizationUrl: string }>(
        `/integrations/accounting/${provider}/authorize`,
        { method: 'POST' },
      );
      if (payload?.authorizationUrl) {
        window.location.href = payload.authorizationUrl;
        return;
      }
      showToast('Missing authorization URL', 'error');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Authorization failed', 'error');
    }
  };

  const handleConnectZoho = async () => {
    try {
      const payload = await apiRequest<{ authorizationUrl: string }>('/integrations/zoho/auth-url');
      const url = (payload as any)?.authorizationUrl || (payload as any)?.url || payload;
      if (url) {
        window.location.href = url;
        return;
      }
      showToast('Missing authorization URL for Zoho', 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Zoho connect failed', 'error');
    }
  };

  const handleTestOdoo = () => {
    setShowOdooModal(true);
  };

  const executeTestOdoo = async (url: string) => {
    if (!url) return;
    try {
      const resp = await apiRequest('/integrations/odoo/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      showToast('Odoo test: ' + JSON.stringify(resp), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Odoo test failed', 'error');
    }
  };

  const renderIntegrationsContent = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--erp-text)]">ERP Integrations</h1>
        <p className="text-sm text-[var(--erp-text-muted)]">
          Connect accounting platforms for invoice export.
        </p>
      </div>

      <DataImport />

      <section className="grid grid-cols-2 gap-4">
        {([
          {
            id: 'zoho',
            label: 'Zoho',
            description: 'Connect Zoho Books / Inventory for customers and items sync.',
          },
          {
            id: 'odoo',
            label: 'Odoo',
            description: 'Connect Odoo via JSON-RPC for partners and products.',
          },
          {
            id: 'xero',
            label: 'Xero',
            description: 'Export invoices to Xero and sync payments.',
          },
          {
            id: 'quickbooks',
            label: 'QuickBooks',
            description: 'Send invoices to QuickBooks Online.',
          },
        ] as const).map((item) => {
          const status = item.id === 'xero' || item.id === 'quickbooks' ? integrationStatus[item.id] : null;
          return (
            <div key={item.id} className="p-4 border border-[var(--erp-border)] rounded space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[var(--erp-text)]">{item.label}</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    status?.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {status?.status === 'connected' ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
              </div>
              <p className="text-[12px] text-[var(--erp-text-muted)]">{item.description}</p>
              <div className="flex items-center gap-2">
                {/* Primary action*/}
                {item.id === 'zoho' ? (
                  <button
                    onClick={handleConnectZoho}
                    className="btn btn-primary btn-sm"
                    disabled={integrationsLoading}
                  >
                    Connect {item.label}
                  </button>
                ) : item.id === 'odoo' ? (
                  <button
                    onClick={handleTestOdoo}
                    className="btn btn-primary btn-sm"
                    disabled={integrationsLoading}
                  >
                    Test {item.label}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAuthorize(item.id as 'xero' | 'quickbooks')}
                    className="btn btn-primary btn-sm"
                    disabled={integrationsLoading}
                  >
                    Connect {item.label}
                  </button>
                )}

                {/* Optional secondary action (Import) for Zoho and Odoo */}
                {(item.id === 'zoho' || item.id === 'odoo') && (
                  <button
                    onClick={() => {
                      setImportProvider(item.id === 'zoho' ? 'zoho' : 'odoo');
                      setImportModalOpen(true);
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Import from {item.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );

  const CurrencySettingsPanel = () => {
    const [rates, setRates] = React.useState<Array<{ id: string; from_currency: string; to_currency: string; rate: number; effective_date: string }>>([]);
    const [supported, setSupported] = React.useState<Array<{ code: string; name: string; symbol: string }>>([]);
    const [showAdd, setShowAdd] = React.useState(false);
    const [rateForm, setRateForm] = React.useState({ from: 'INR', to: 'USD', rate: '' });
    const [rateSaving, setRateSaving] = React.useState(false);

    React.useEffect(() => {
      const loadRates = async () => {
        try {
          const [ratesData, supportedData] = await Promise.all([
            apiRequest<any[]>('/currency/rates'),
            apiRequest<any[]>('/currency/supported'),
          ]);
          setRates(Array.isArray(ratesData) ? ratesData : []);
          setSupported(Array.isArray(supportedData) ? supportedData : []);
        } catch { /* ignore */ }
      };
      loadRates();
    }, []);

    const handleAddRate = async () => {
      if (!rateForm.rate) return;
      setRateSaving(true);
      try {
        const result = await apiRequest<any>('/currency/rates', {
          method: 'POST',
          body: JSON.stringify({ from: rateForm.from, to: rateForm.to, rate: Number(rateForm.rate) }),
        });
        setRates(prev => {
          const filtered = prev.filter(r => !(r.from_currency === rateForm.from && r.to_currency === rateForm.to));
          return [result, ...filtered];
        });
        setShowAdd(false);
        setRateForm({ from: 'INR', to: 'USD', rate: '' });
      } catch { /* ignore */ }
      setRateSaving(false);
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--erp-text)]">Currency & Exchange Rates</h1>
          <p className="text-sm text-[var(--erp-text-muted)]">
            Manage exchange rates for multi-currency support. Base currency: <b>{companyForm.currency || 'INR'}</b>
          </p>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[var(--erp-text)]">Exchange Rates</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">add</span>
            Add Rate
          </button>
        </div>
        {showAdd && (
          <div className="p-4 border border-[var(--erp-border)] rounded bg-slate-50 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">From</label>
                <select className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                  value={rateForm.from} onChange={e => setRateForm(p => ({ ...p, from: e.target.value }))}>
                  {supported.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">To</label>
                <select className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                  value={rateForm.to} onChange={e => setRateForm(p => ({ ...p, to: e.target.value }))}>
                  {supported.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Rate</label>
                <input type="number" step="0.000001" className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3"
                  placeholder="e.g. 0.012" value={rateForm.rate} onChange={e => setRateForm(p => ({ ...p, rate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleAddRate} disabled={rateSaving} className="btn btn-primary btn-sm">
                {rateSaving ? 'Saving...' : 'Save Rate'}
              </button>
            </div>
          </div>
        )}
        <table className="w-full text-[12px] border border-[var(--erp-border)] rounded">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">From</th>
              <th className="text-left px-3 py-2">To</th>
              <th className="text-right px-3 py-2">Rate</th>
              <th className="text-left px-3 py-2">Effective Date</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.id} className="border-t border-[var(--erp-border)] hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{r.from_currency}</td>
                <td className="px-3 py-2 font-medium">{r.to_currency}</td>
                <td className="px-3 py-2 text-right font-mono">{Number(r.rate).toFixed(6)}</td>
                <td className="px-3 py-2 text-[var(--erp-text-muted)]">{new Date(r.effective_date).toLocaleDateString()}</td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No exchange rates configured</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyContent();
      case 'notifications':
        return renderNotificationsContent();
      case 'processing':
        return isAdmin ? renderProcessingContent() : renderStaticContent('Automation Settings', 'Admin-only queue and LLM throughput limits.');
      case 'communication':
        return <EmailIntegrations onSuccess={refreshData} />;
      case 'whatsapp':
        return <WhatsAppSettings />;
      case 'ai':
        return <AISettingsPanel />;
      case 'email-templates':
        return <EmailTemplatesContent />;
      case 'integrations':
        return renderIntegrationsContent();
      case 'currency':
        return <CurrencySettingsPanel />;
      case 'billing':
        return renderStaticContent('Billing & Subscription', 'Plan usage and invoice details.');
      default:
        return renderCompanyContent();
    }
  };

  return (
    <>
      <PageLayout>
        <main className="flex-1 flex min-w-0 bg-white overflow-hidden">
          {/* Settings Sidebar */}
          <aside
            className="w-[200px] shrink-0 border-r border-[var(--erp-border)] flex flex-col overflow-y-auto"
            style={{ background: 'var(--palette-deep-space)' }}
          >
            <div className="px-4 py-3.5 border-b border-[rgba(255,255,255,0.1)]">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Settings</p>
            </div>
            <nav className="py-2 flex-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
                    activeTab === tab.id ? 'text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { backgroundImage: 'linear-gradient(90deg, rgba(0,126,167,1) 0%, rgba(0,167,225,0.85) 42%, rgba(0,52,89,0) 100%)' }
                      : undefined
                  }
                >
                  <span className="material-symbols-outlined !text-[18px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-4xl">{renderTabContent()}</div>
            </div>

            <div className="h-12 border-t border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-5 shrink-0">
              <span className="text-[11px] text-[var(--erp-text-muted)]">
                {hasUnsavedChanges
                  ? 'You have unsaved changes'
                  : 'Settings are in sync'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDiscard}
                  className="px-4 py-1.5 text-sm font-medium text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary btn-md"
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <span className="material-symbols-outlined !text-[16px]">save</span>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </PageLayout>
      <IntegrationImport
        provider={importProvider}
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        showToast={(message: string, type?: string) => showToast(message, (type as any) || 'info')}
      />
      {/* Odoo JSON-RPC Endpoint Modal */}
      <PromptModal
        isOpen={showOdooModal}
        onClose={() => setShowOdooModal(false)}
        onConfirm={(url) => {
          const trimmed = url.trim();
          if (trimmed) {
            void executeTestOdoo(trimmed);
          }
          setShowOdooModal(false);
        }}
        title="Test Odoo Connection"
        fieldLabel="Odoo JSON-RPC Endpoint"
        placeholder="https://odoo.example.com/jsonrpc"
        confirmLabel="Test"
      />
    </>
  );
};

export default SystemConfig;
