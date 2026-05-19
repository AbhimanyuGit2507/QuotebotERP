-- CreateTable
CREATE TABLE "ItemMatchRun" (
    "id" TEXT NOT NULL,
    "item_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "input_text" TEXT NOT NULL,
    "stage_used" TEXT NOT NULL,
    "best_match_id" TEXT,
    "confidence" DECIMAL(5,4),
    "auto_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMatchCandidate" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "product_id" TEXT,
    "score" DECIMAL(6,4) NOT NULL,
    "rank" INTEGER NOT NULL,
    "reason_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAlias" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "alias_text" TEXT NOT NULL,
    "canonical_product_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "weight" DECIMAL(6,4) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMatchFeedback" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "selected_product_id" TEXT,
    "reviewer_id" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMatchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMatchConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "suggestion_threshold" DECIMAL(5,4) NOT NULL DEFAULT 0.8,
    "auto_accept_threshold" DECIMAL(5,4) NOT NULL DEFAULT 0.92,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "model_version" TEXT NOT NULL DEFAULT 'v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMatchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemMatchRun_tenant_id_created_at_idx" ON "ItemMatchRun"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ItemMatchRun_item_id_idx" ON "ItemMatchRun"("item_id");

-- CreateIndex
CREATE INDEX "ItemMatchCandidate_run_id_rank_idx" ON "ItemMatchCandidate"("run_id", "rank");

-- CreateIndex
CREATE INDEX "ItemMatchCandidate_product_id_idx" ON "ItemMatchCandidate"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_tenant_id_alias_text_canonical_product_id_key" ON "ItemAlias"("tenant_id", "alias_text", "canonical_product_id");

-- CreateIndex
CREATE INDEX "ItemAlias_tenant_id_alias_text_idx" ON "ItemAlias"("tenant_id", "alias_text");

-- CreateIndex
CREATE INDEX "ItemMatchFeedback_run_id_created_at_idx" ON "ItemMatchFeedback"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "ItemMatchFeedback_reviewer_id_idx" ON "ItemMatchFeedback"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMatchConfig_tenant_id_key" ON "ItemMatchConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "ItemMatchConfig_tenant_id_idx" ON "ItemMatchConfig"("tenant_id");

-- AddForeignKey
ALTER TABLE "ItemMatchRun" ADD CONSTRAINT "ItemMatchRun_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMatchCandidate" ADD CONSTRAINT "ItemMatchCandidate_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ItemMatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAlias" ADD CONSTRAINT "ItemAlias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMatchFeedback" ADD CONSTRAINT "ItemMatchFeedback_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ItemMatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMatchConfig" ADD CONSTRAINT "ItemMatchConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
