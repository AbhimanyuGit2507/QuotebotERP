-- Add display_name and search_tokens to RFQ, Quotation, and Invoice
ALTER TABLE "RFQ" ADD COLUMN "display_name" TEXT;
ALTER TABLE "RFQ" ADD COLUMN "search_tokens" JSONB;

ALTER TABLE "Quotation" ADD COLUMN "display_name" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "search_tokens" JSONB;

ALTER TABLE "Invoice" ADD COLUMN "display_name" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "search_tokens" JSONB;
