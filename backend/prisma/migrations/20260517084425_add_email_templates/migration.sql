-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('QUOTATION_EMAIL', 'INVOICE_EMAIL', 'PO_EMAIL', 'INVOICE_PDF_HEADER', 'INVOICE_PDF_FOOTER');

-- AlterTable
ALTER TABLE "AssistancePurchaseOrder" ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "sent_email_body" TEXT,
ADD COLUMN     "sent_email_subject" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "sent_email_body" TEXT,
ADD COLUMN     "sent_email_subject" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "sent_email_body" TEXT,
ADD COLUMN     "sent_email_subject" TEXT;

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_type" "EmailTemplateType" NOT NULL,
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "variables_help" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTemplate_tenant_id_idx" ON "EmailTemplate"("tenant_id");

-- CreateIndex
CREATE INDEX "EmailTemplate_template_type_idx" ON "EmailTemplate"("template_type");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_tenant_id_template_type_key" ON "EmailTemplate"("tenant_id", "template_type");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
