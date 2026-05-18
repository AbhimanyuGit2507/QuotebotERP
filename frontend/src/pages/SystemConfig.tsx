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
  | 'whatsapp'
  | 'notifications'
  | 'email-templates'
  | 'integrations'
  | 'billing';

const tabs: { id: ConfigTab; label: string; icon: string }[] = [
  { id: 'company', label: 'Company', icon: 'business' },
  { id: 'communication', label: 'Email', icon: 'mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'email-templates', label: 'Email Templates', icon: 'mail_outline' },
  { id: 'integrations', label: 'Integrations', icon: 'hub' },
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

const SystemConfig: React.FC = () => {
  const { user } = useAuth();
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

    return false;
  }, [
    activeTab,
    companyForm,
    savedCompanyForm,
    notificationForm,
    notificationSettings,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyContent();
      case 'notifications':
        return renderNotificationsContent();
      case 'communication':
        return <EmailIntegrations onSuccess={refreshData} />;
      case 'whatsapp':
        return renderStaticContent('WhatsApp Configuration', 'WhatsApp business profile and auto-reply settings.');
      case 'email-templates':
        return <EmailTemplatesContent />;
      case 'integrations':
        return renderIntegrationsContent();
      case 'billing':
        return renderStaticContent('Billing & Subscription', 'Plan usage and invoice details.');
      default:
        return renderCompanyContent();
    }
  };

  return (
    <>
      <PageLayout>
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="h-11 border-b border-[var(--erp-border)] flex items-center px-3 bg-slate-50 shrink-0 gap-0.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-[var(--erp-accent)] shadow-sm border border-[var(--erp-border)]'
                    : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-white/50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="material-symbols-outlined !text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

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
