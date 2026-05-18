import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

interface EmailTemplate {
  id: string;
  template_type: string;
  subject_template: string;
  body_template: string;
  variables_help: Record<string, string>;
  is_active: boolean;
}

const TEMPLATE_TYPES = [
  {
    key: 'QUOTATION_EMAIL',
    label: 'Quotation Email',
    description: 'Email sent when sharing quotations with customers',
  },
  {
    key: 'INVOICE_EMAIL',
    label: 'Invoice Email',
    description: 'Email sent when sharing invoices with customers',
  },
  {
    key: 'PO_EMAIL',
    label: 'Purchase Order Email',
    description: 'Email sent to confirm receipt of purchase orders',
  },
  {
    key: 'INVOICE_PDF_HEADER',
    label: 'Invoice PDF Header',
    description: 'Header section of generated invoice PDFs',
  },
  {
    key: 'INVOICE_PDF_FOOTER',
    label: 'Invoice PDF Footer',
    description: 'Footer section of generated invoice PDFs',
  },
];

export default function EmailTemplatesContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('QUOTATION_EMAIL');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest<EmailTemplate[]>('/email-templates');
      setTemplates(data);

      // If no templates exist, initialize defaults
      if (data.length === 0) {
        await initializeDefaults();
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      const response = await apiRequest('/email-templates/initialize', {
        method: 'POST',
      });
      if (response !== undefined) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
    }
  };

  const getCurrentTemplate = () => {
    return templates.find((t) => t.template_type === selectedType);
  };

  const handleEdit = () => {
    const template = getCurrentTemplate();
    if (template) {
      setEditingTemplate({ ...template });
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      await apiRequest('/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: editingTemplate.template_type,
          subject_template: editingTemplate.subject_template,
          body_template: editingTemplate.body_template,
          variables_help: editingTemplate.variables_help,
          is_active: editingTemplate.is_active,
        }),
      });

      await fetchTemplates();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  const currentTemplate = editingTemplate || getCurrentTemplate();
  const templateTypeInfo = TEMPLATE_TYPES.find((t) => t.key === selectedType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--erp-text)]">Email Templates</h1>
        <p className="text-sm text-[var(--erp-text-muted)]">
          Customize email templates for quotations, invoices, and purchase orders
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar - Template Types */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-[var(--erp-border)]">
          <div className="p-3 border-b border-[var(--erp-border)]">
            <h2 className="font-medium text-[var(--erp-text)] text-sm">Template Types</h2>
          </div>
          <div className="p-2">
            {TEMPLATE_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => {
                  setSelectedType(type.key);
                  setEditingTemplate(null);
                  setShowPreview(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                  selectedType === type.key
                    ? 'bg-[var(--erp-accent)]/10 text-[var(--erp-accent)] font-medium'
                    : 'text-[var(--erp-text)] hover:bg-[var(--erp-surface)]'
                }`}
              >
                <div className="text-sm">{type.label}</div>
                <div className="text-xs text-[var(--erp-text-muted)] mt-0.5">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Template Editor */}
        <div className="col-span-9 bg-white rounded-lg shadow-sm border border-[var(--erp-border)]">
          <div className="p-4 border-b border-[var(--erp-border)] flex items-center justify-between">
            <div>
              <h2 className="font-medium text-[var(--erp-text)]">{templateTypeInfo?.label}</h2>
              <p className="text-xs text-[var(--erp-text-muted)] mt-0.5">{templateTypeInfo?.description}</p>
            </div>
            <div className="flex gap-2">
              {!editingTemplate ? (
                <>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3 py-1.5 text-sm bg-[var(--erp-surface)] text-[var(--erp-text)] rounded hover:bg-[var(--erp-surface-strong)] transition-colors"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1.5 text-sm bg-[var(--erp-accent)] text-white rounded hover:bg-[var(--erp-accent-strong)] transition-colors"
                  >
                    Edit Template
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-[var(--erp-surface)] text-[var(--erp-text)] rounded hover:bg-[var(--erp-surface-strong)] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-4">
            {editingTemplate ? (
              <div className="space-y-4">
                {/* Subject Template */}
                <div>
                  <label className="block text-sm font-medium text-[var(--erp-text)] mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject_template}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        subject_template: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--erp-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--erp-accent)]"
                    placeholder="e.g., Quotation {{quotation_number}} from {{company_name}}"
                  />
                </div>

                {/* Body Template */}
                <div>
                  <label className="block text-sm font-medium text-[var(--erp-text)] mb-2">
                    Email Body
                  </label>
                  <textarea
                    value={editingTemplate.body_template}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        body_template: e.target.value,
                      })
                    }
                    rows={15}
                    className="w-full px-3 py-2 border border-[var(--erp-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--erp-accent)] font-mono text-sm"
                    placeholder="Enter your email template here. Use {{variable_name}} for dynamic content."
                  />
                </div>

                {/* Available Variables */}
                <div className="bg-[var(--erp-accent)]/10 border border-[var(--erp-accent)]/20 rounded-md p-4">
                  <h3 className="text-sm font-medium text-[var(--erp-text)] mb-2">
                    Available Variables
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {currentTemplate?.variables_help &&
                      Object.entries(currentTemplate.variables_help).map(([key, desc]) => (
                        <div key={key} className="flex items-start">
                          <code className="bg-[var(--erp-accent)]/20 text-[var(--erp-accent)] px-1.5 py-0.5 rounded text-xs font-mono">
                            {`{{${key}}}`}
                          </code>
                          <span className="text-[var(--erp-text-muted)] ml-2 text-xs">{desc}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Read-only view */}
                <div>
                  <label className="block text-sm font-medium text-[var(--erp-text)] mb-2">
                    Email Subject
                  </label>
                  <div className="px-3 py-2 bg-[var(--erp-surface)] border border-[var(--erp-border)] rounded-md text-[var(--erp-text)]">
                    {currentTemplate?.subject_template || 'No template configured'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--erp-text)] mb-2">
                    Email Body
                  </label>
                  <div className="px-3 py-2 bg-[var(--erp-surface)] border border-[var(--erp-border)] rounded-md text-[var(--erp-text)] font-mono text-sm whitespace-pre-wrap min-h-[300px]">
                    {currentTemplate?.body_template || 'No template configured'}
                  </div>
                </div>

                {/* Preview Section */}
                {showPreview && currentTemplate && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-amber-900 mb-3">
                      Preview (with sample data)
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-amber-800 mb-1">Subject:</div>
                        <div className="bg-white px-3 py-2 rounded border border-amber-300 text-sm">
                          {currentTemplate.subject_template
                            .replace(/{{client_name}}/g, 'Acme Corp')
                            .replace(/{{company_name}}/g, 'Your Company')
                            .replace(/{{quotation_number}}/g, 'QT-2024-001')
                            .replace(/{{invoice_number}}/g, 'INV-2024-001')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-amber-800 mb-1">Body:</div>
                        <div className="bg-white px-3 py-2 rounded border border-amber-300 text-sm whitespace-pre-wrap font-mono">
                          {currentTemplate.body_template
                            .replace(/{{client_name}}/g, 'Acme Corp')
                            .replace(/{{company_name}}/g, 'Your Company')
                            .replace(/{{quotation_number}}/g, 'QT-2024-001')
                            .replace(/{{invoice_number}}/g, 'INV-2024-001')
                            .replace(/{{quotation_date}}/g, '2024-05-17')
                            .replace(/{{invoice_date}}/g, '2024-05-17')
                            .replace(/{{valid_until}}/g, '2024-06-17')
                            .replace(/{{due_date}}/g, '2024-06-01')
                            .replace(/{{currency}}/g, 'INR')
                            .replace(/{{total_amount}}/g, '50,000')
                            .replace(/{{custom_message}}/g, '')
                            .replace(/{{item_details}}/g, '1. Product A - Qty: 10 units @ INR 1000/unit = INR 10000\n2. Product B - Qty: 5 units @ INR 8000/unit = INR 40000')
                            .replace(/{{stock_warnings}}/g, '')
                            .replace(/{{payment_status}}/g, 'Status: PENDING PAYMENT')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Variables (read-only) */}
                <div className="bg-[var(--erp-surface)] border border-[var(--erp-border)] rounded-md p-4">
                  <h3 className="text-sm font-medium text-[var(--erp-text)] mb-2">
                    Available Variables
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {currentTemplate?.variables_help &&
                      Object.entries(currentTemplate.variables_help).map(([key, desc]) => (
                        <div key={key} className="flex items-start">
                          <code className="bg-[var(--erp-surface-strong)] text-[var(--erp-text)] px-1.5 py-0.5 rounded text-xs font-mono">
                            {`{{${key}}}`}
                          </code>
                          <span className="text-[var(--erp-text-muted)] ml-2 text-xs">{desc}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
