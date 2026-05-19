/*
  Warnings:

  - You are about to alter the column `available_quantity` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- DropForeignKey
ALTER TABLE "ChartOfAccount" DROP CONSTRAINT "ChartOfAccount_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "ChartOfAccount" DROP CONSTRAINT "ChartOfAccount_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_credit_account_id_fkey";

-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_debit_account_id_fkey";

-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_tenant_id_fkey";

-- DropIndex
DROP INDEX "AssistancePurchaseOrder_display_name_idx";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quotation" ALTER COLUMN "valid_until" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuotationItem" ALTER COLUMN "available_quantity" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "invoice_number" TEXT,
    "amount" DECIMAL(12,2),
    "currency" TEXT,
    "due_date" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raw_extract" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bill_tenant_id_idx" ON "Bill"("tenant_id");

-- CreateIndex
CREATE INDEX "Bill_message_id_idx" ON "Bill"("message_id");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
