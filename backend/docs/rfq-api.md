RFQ & Quotation API reference

Overview
- RFQ endpoints: /api/rfqs
- Quotation endpoints: /api/quotations
- Auth: JWT (use test override in e2e)

Key endpoints

1) Preview extraction from email
POST /rfqs/preview-from-email
Body:
{
  "client_email": "customer@example.com",
  "message_id": "<optional message id>",
  "items": [
    { "product_name": "Business Laptop", "quantity": 1, "unit": "pcs" },
    { "product_name": "LED Monitor 27 inch QHD", "quantity": 20, "unit": "pcs" }
  ]
}
Response:
{
  "message_id": "...",
  "client_email": "...",
  "matched_items": [ /* matched items with product_id, notes, unit */ ],
  "unmatched_items": [ /* rejected items with reason codes */ ],
  "summary": "Matched 1 item(s), Rejected 1 item(s)."
}

2) Create RFQ from email (will create Quotation too)
POST /rfqs/from-email
Body: same as preview. Requires message_id that exists in DB.
Behavior:
- If message.raw_payload contains an existing rfq_id, the service updates that RFQ (reparse) and recreates the linked quotation (old quotation is deleted).
- On success the message.raw_payload will be updated with rfq_id and quotation_id.
Response: full RFQ object (includes created quotation_id in payload)

3) Delete RFQ
DELETE /rfqs/:id
Query params:
- forceDeleteLinkedQuotation=true — optional. When RFQ has a linked Quotation, deletion without this flag will be rejected with 400 and a message indicating the linked quotation id.

4) Convert RFQ to Quotation (manual)
POST /rfqs/:id/convert-to-quotation
- Creates quotation and links it to the RFQ.

5) Delete Quotation
DELETE /quotations/:id
Query params:
- forceDeleteLinkedRfq=true — optional. When Quotation has a linked RFQ, deletion without this flag will be rejected.

Per-item metadata
- RFQ and Quotation items include `notes` for stock warnings and `availability`/`available_quantity` fields persisted on Quotation items:
  - `availability`: one of `out_of_stock`, `insufficient_stock`, `available`
  - `available_quantity`: numeric stock available when insufficient

UX guidance
- Inbox detail should always render `parsed_items` (from message.raw_payload) and show per-item `status` (matched|rejected|unmatched) and `notes`.
- RFQ should include all extracted items (even unmatched) with notes describing the issue when present.
- Quotation should present item-level availability notes and should not modify invoice totals because of warnings; warnings are informational and listed in `terms_conditions` and in the email body when sending.

Testing tips
- Use the provided e2e test `test/rfq-email-e2e.spec.ts` to validate reparse/update, per-item warnings, and deletion flows.

