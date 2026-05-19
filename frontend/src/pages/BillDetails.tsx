import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import PageLayout from '../components/common/PageLayout';
import { getBillById, apiRequest } from '../services/api';

const BillDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<any | null>(null);

  const configureDOMPurify = useCallback(() => {
    DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
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
    return () => DOMPurify.removeHook('beforeSanitizeAttributes');
  }, [configureDOMPurify]);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    const load = async () => {
      try {
        const data = await getBillById(id);
        if (cancelled) return;
        setBill(data);

        // If bill is linked to a message, try to fetch the message for preview
        if (data?.message_id) {
          try {
            const msg = await apiRequest(`/inbox/messages/${data.message_id}`);
            if (!cancelled) setMessage(msg);
          } catch (err) {
            // non-fatal: fallback to raw extract view
            console.warn('Could not fetch linked message for preview', err);
          }
        }
      } catch (err) {
        console.error('Failed to load bill', err);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id, configureDOMPurify]);

  if (!id) return <PageLayout title="Bill Details"><div className="p-4">Missing bill id</div></PageLayout>;

  const sanitizedHtml = message?.contentHtml
    ? DOMPurify.sanitize(message.contentHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
        FORBID_ATTR: ['style'],
      })
    : '';

  return (
    <PageLayout title="Bill Details">
      <div className="p-4">
        {!bill ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{bill.subject}</h3>
            <div><strong>From:</strong> {bill.from_email}</div>
            <div><strong>Invoice #:</strong> {bill.invoice_number || '—'}</div>
            <div><strong>Amount:</strong> {bill.amount ? Number(bill.amount).toLocaleString() : '—'}</div>
            <div><strong>Confidence:</strong> {Math.round((bill.confidence || 0) * 100)}%</div>
            <div><strong>Status:</strong> {bill.status}</div>

            <div>
              <strong>Raw Extract:</strong>
              <pre className="p-2 bg-slate-50 rounded mt-2 overflow-auto text-xs">{JSON.stringify(bill.raw_extract || {}, null, 2)}</pre>
            </div>

            {sanitizedHtml ? (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Message Preview</h4>
                <div className="isolate relative overflow-hidden rounded border border-[var(--erp-border)] bg-white">
                  <iframe
                    title="Bill message content"
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
              </div>
            ) : bill.message_id ? (
              <div className="mt-4">Message preview not available. <Link to={`/inbox/${bill.message_id}`} className="text-blue-600">Open in Inbox</Link></div>
            ) : null}

          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default BillDetails;
