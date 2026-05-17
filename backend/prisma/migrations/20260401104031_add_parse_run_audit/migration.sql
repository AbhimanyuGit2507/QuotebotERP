-- CreateTable
CREATE TABLE "ParseRun" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "message_id" TEXT,
    "client_email" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unmatched_count" INTEGER NOT NULL DEFAULT 0,
    "input_items_json" JSONB,
    "matched_items_json" JSONB,
    "unmatched_items_json" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParseRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParseRun_tenant_id_idx" ON "ParseRun"("tenant_id");

-- CreateIndex
CREATE INDEX "ParseRun_message_id_idx" ON "ParseRun"("message_id");

-- CreateIndex
CREATE INDEX "ParseRun_stage_idx" ON "ParseRun"("stage");

-- CreateIndex
CREATE INDEX "ParseRun_status_idx" ON "ParseRun"("status");

-- CreateIndex
CREATE INDEX "ParseRun_created_at_idx" ON "ParseRun"("created_at");

-- AddForeignKey
ALTER TABLE "ParseRun" ADD CONSTRAINT "ParseRun_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
