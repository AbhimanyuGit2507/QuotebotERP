-- Chart of Accounts
CREATE TABLE IF NOT EXISTS "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "debit_account_id" TEXT NOT NULL,
    "credit_account_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ChartOfAccount_tenant_id_code_key" ON "ChartOfAccount"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "ChartOfAccount_tenant_id_idx" ON "ChartOfAccount"("tenant_id");
CREATE INDEX IF NOT EXISTS "ChartOfAccount_deleted_at_idx" ON "ChartOfAccount"("deleted_at");
CREATE INDEX IF NOT EXISTS "JournalEntry_tenant_id_idx" ON "JournalEntry"("tenant_id");
CREATE INDEX IF NOT EXISTS "JournalEntry_tenant_id_date_idx" ON "JournalEntry"("tenant_id", "date");
CREATE INDEX IF NOT EXISTS "JournalEntry_reference_type_reference_id_idx" ON "JournalEntry"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "JournalEntry_deleted_at_idx" ON "JournalEntry"("deleted_at");

-- Foreign Keys
DO $$ BEGIN
  ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "ChartOfAccount"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "ChartOfAccount"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
