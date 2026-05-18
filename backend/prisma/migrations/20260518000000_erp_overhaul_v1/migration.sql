-- ERP Overhaul v1 Migration
-- This migration covers:
-- 1. Float → Decimal for monetary/quantity fields
-- 2. String → DateTime for date fields
-- 3. New deleted_at columns for soft-delete support
-- 4. New TaxProfile model
-- 5. Approval workflow fields on Quotation
-- 6. Payment status fields on Invoice
-- 7. New columns on Payment
-- 8. Tenant registration flags
-- 9. SettingsCompany threshold and GSTIN columns
-- 10. Indexes on deleted_at columns

-- ============================================
-- TENANT: Add allow_public_registration flag
-- ============================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "allow_public_registration" BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- PRODUCT: Float → Decimal, add deleted_at
-- ============================================
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2);
ALTER TABLE "Product" ALTER COLUMN "cost" TYPE DECIMAL(12,2) USING "cost"::DECIMAL(12,2);
ALTER TABLE "Product" ALTER COLUMN "gst_percent" TYPE DECIMAL(5,2) USING "gst_percent"::DECIMAL(5,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Product_deleted_at_idx" ON "Product"("deleted_at");

-- ============================================
-- CLIENT: Float → Decimal for total_value, add deleted_at
-- ============================================
ALTER TABLE "Client" ALTER COLUMN "total_value" TYPE DECIMAL(12,2) USING "total_value"::DECIMAL(12,2);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Client_deleted_at_idx" ON "Client"("deleted_at");

-- ============================================
-- RFQ: add deleted_at
-- ============================================
ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RFQ_deleted_at_idx" ON "RFQ"("deleted_at");

-- ============================================
-- RFQItem: Float → Decimal for quantity, add deleted_at
-- ============================================
ALTER TABLE "RFQItem" ALTER COLUMN "quantity" TYPE DECIMAL(12,2) USING "quantity"::DECIMAL(12,2);
ALTER TABLE "RFQItem" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RFQItem_deleted_at_idx" ON "RFQItem"("deleted_at");

-- ============================================
-- QUOTATION: Float → Decimal, String → DateTime, add approval fields, add deleted_at
-- ============================================
-- Convert date fields from String to DateTime (handle existing data)
-- First create temp columns, migrate data, then swap
ALTER TABLE "Quotation" ALTER COLUMN "subtotal" TYPE DECIMAL(12,2) USING "subtotal"::DECIMAL(12,2);
ALTER TABLE "Quotation" ALTER COLUMN "tax" TYPE DECIMAL(12,2) USING "tax"::DECIMAL(12,2);
ALTER TABLE "Quotation" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2);

-- Date field conversion: if date was String, convert to DateTime
-- Use a safe approach: only alter if the column is currently TEXT type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Quotation' AND column_name = 'date' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Quotation" ALTER COLUMN "date" TYPE TIMESTAMP(3) USING
      CASE WHEN "date" IS NOT NULL AND "date" != '' THEN "date"::TIMESTAMP(3) ELSE NOW() END;
    ALTER TABLE "Quotation" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Quotation' AND column_name = 'valid_until' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Quotation" ALTER COLUMN "valid_until" TYPE TIMESTAMP(3) USING
      CASE WHEN "valid_until" IS NOT NULL AND "valid_until" != '' THEN "valid_until"::TIMESTAMP(3) ELSE NULL END;
  END IF;
END $$;

-- Add approval workflow fields
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approved_by" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Quotation_deleted_at_idx" ON "Quotation"("deleted_at");

-- ============================================
-- QUOTATION ITEM: Float → Decimal, add availability fields, add deleted_at
-- ============================================
ALTER TABLE "QuotationItem" ALTER COLUMN "quantity" TYPE DECIMAL(12,2) USING "quantity"::DECIMAL(12,2);
ALTER TABLE "QuotationItem" ALTER COLUMN "unit_price" TYPE DECIMAL(12,2) USING "unit_price"::DECIMAL(12,2);
ALTER TABLE "QuotationItem" ALTER COLUMN "tax_percent" TYPE DECIMAL(5,2) USING "tax_percent"::DECIMAL(5,2);
ALTER TABLE "QuotationItem" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2);
ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "availability" TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "available_quantity" DECIMAL(12,2);
ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "QuotationItem_deleted_at_idx" ON "QuotationItem"("deleted_at");

-- ============================================
-- INVOICE: Float → Decimal, String → DateTime, add payment_status, conversation_id, deleted_at
-- ============================================
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" TYPE DECIMAL(12,2) USING "subtotal"::DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "tax" TYPE DECIMAL(12,2) USING "tax"::DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "paid_amount" TYPE DECIMAL(12,2) USING "paid_amount"::DECIMAL(12,2);

-- Convert date fields from String to DateTime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Invoice' AND column_name = 'date' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Invoice" ALTER COLUMN "date" TYPE TIMESTAMP(3) USING
      CASE WHEN "date" IS NOT NULL AND "date" != '' THEN "date"::TIMESTAMP(3) ELSE NOW() END;
    ALTER TABLE "Invoice" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Invoice' AND column_name = 'due_date' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Invoice" ALTER COLUMN "due_date" TYPE TIMESTAMP(3) USING
      CASE WHEN "due_date" IS NOT NULL AND "due_date" != '' THEN "due_date"::TIMESTAMP(3) ELSE NULL END;
  END IF;
END $$;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "conversation_id" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "search_tokens" JSONB;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Invoice_deleted_at_idx" ON "Invoice"("deleted_at");
CREATE INDEX IF NOT EXISTS "Invoice_conversation_id_idx" ON "Invoice"("conversation_id");

-- Add FK for conversation_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Invoice_conversation_id_fkey'
  ) THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- PAYMENT: Float → Decimal, add new columns, add deleted_at
-- ============================================
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "reference_number" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- ============================================
-- SETTINGS COMPANY: Add threshold and GSTIN columns
-- ============================================
ALTER TABLE "SettingsCompany" ADD COLUMN IF NOT EXISTS "quotation_approval_threshold" DECIMAL(12,2);
ALTER TABLE "SettingsCompany" ADD COLUMN IF NOT EXISTS "company_gstin" TEXT;

-- ============================================
-- TAX PROFILE: New model
-- ============================================
CREATE TABLE IF NOT EXISTS "TaxProfile" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "hsn_code" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaxProfile_tenant_id_idx" ON "TaxProfile"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "TaxProfile_tenant_id_name_key" ON "TaxProfile"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "TaxProfile_deleted_at_idx" ON "TaxProfile"("deleted_at");

-- Add FK if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TaxProfile_tenant_id_fkey'
  ) THEN
    ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Sync existing invoice payment_status from current status field
UPDATE "Invoice"
SET "payment_status" = CASE
  WHEN "status" = 'paid' THEN 'paid'
  WHEN "status" = 'partial' THEN 'partial'
  ELSE 'unpaid'
END
WHERE "payment_status" = 'unpaid' AND "status" IN ('paid', 'partial');
