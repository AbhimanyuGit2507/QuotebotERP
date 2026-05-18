ALTER TABLE "AssistancePurchaseOrder" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "AssistancePurchaseOrder" ADD COLUMN IF NOT EXISTS "search_tokens" JSONB;

CREATE INDEX IF NOT EXISTS "AssistancePurchaseOrder_display_name_idx" ON "AssistancePurchaseOrder"("display_name");
