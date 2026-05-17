-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageClassification" AS ENUM ('RFQ', 'FOLLOWUP', 'PO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FollowupType" AS ENUM ('TECHNICAL', 'NEGOTIATION', 'DELIVERY', 'GENERAL');

-- CreateEnum
CREATE TYPE "AssistanceTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DETECTED', 'MATCHED', 'REVIEW_PENDING', 'APPROVED', 'INVOICE_GENERATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationStage" AS ENUM ('NEW_RFQ', 'QUOTE_GENERATED', 'QUOTE_SENT', 'FOLLOWUP_PENDING', 'MANUAL_ASSISTANCE', 'PO_RECEIVED', 'PO_VERIFIED', 'INVOICE_SENT', 'PAYMENT_PENDING', 'PAID', 'CLOSED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assigned_operator_id" TEXT,
ADD COLUMN     "current_stage" "ConversationStage" NOT NULL DEFAULT 'NEW_RFQ',
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_name" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "conversation_id" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments_json" JSONB,
ADD COLUMN     "classification" "MessageClassification" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "classification_confidence" DOUBLE PRECISION,
ADD COLUMN     "followup_type" "FollowupType",
ADD COLUMN     "in_reply_to" TEXT,
ADD COLUMN     "message_id_header" TEXT,
ADD COLUMN     "recipients" TEXT,
ADD COLUMN     "references_header" TEXT,
ADD COLUMN     "workflow_direction" "MessageDirection" NOT NULL DEFAULT 'INBOUND';

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "conversation_id" TEXT;

-- AlterTable
ALTER TABLE "RFQ" ADD COLUMN     "conversation_id" TEXT;

-- CreateTable
CREATE TABLE "AssistancePurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "quotation_id" TEXT,
    "invoice_id" TEXT,
    "po_number" TEXT,
    "extracted_data" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DETECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistancePurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceTicket" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "type" "FollowupType" NOT NULL,
    "status" "AssistanceTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistancePurchaseOrder_tenant_id_idx" ON "AssistancePurchaseOrder"("tenant_id");

-- CreateIndex
CREATE INDEX "AssistancePurchaseOrder_conversation_id_idx" ON "AssistancePurchaseOrder"("conversation_id");

-- CreateIndex
CREATE INDEX "AssistancePurchaseOrder_quotation_id_idx" ON "AssistancePurchaseOrder"("quotation_id");

-- CreateIndex
CREATE INDEX "AssistancePurchaseOrder_invoice_id_idx" ON "AssistancePurchaseOrder"("invoice_id");

-- CreateIndex
CREATE INDEX "AssistancePurchaseOrder_status_idx" ON "AssistancePurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "AssistanceTicket_tenant_id_idx" ON "AssistanceTicket"("tenant_id");

-- CreateIndex
CREATE INDEX "AssistanceTicket_conversation_id_idx" ON "AssistanceTicket"("conversation_id");

-- CreateIndex
CREATE INDEX "AssistanceTicket_message_id_idx" ON "AssistanceTicket"("message_id");

-- CreateIndex
CREATE INDEX "AssistanceTicket_status_idx" ON "AssistanceTicket"("status");

-- CreateIndex
CREATE INDEX "AssistanceTicket_assigned_to_id_idx" ON "AssistanceTicket"("assigned_to_id");

-- CreateIndex
CREATE INDEX "Conversation_current_stage_idx" ON "Conversation"("current_stage");

-- CreateIndex
CREATE INDEX "Conversation_assigned_operator_id_idx" ON "Conversation"("assigned_operator_id");

-- CreateIndex
CREATE INDEX "Invoice_conversation_id_idx" ON "Invoice"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_workflow_direction_idx" ON "Message"("workflow_direction");

-- CreateIndex
CREATE INDEX "Message_classification_idx" ON "Message"("classification");

-- CreateIndex
CREATE INDEX "Message_followup_type_idx" ON "Message"("followup_type");

-- CreateIndex
CREATE INDEX "Message_message_id_header_idx" ON "Message"("message_id_header");

-- CreateIndex
CREATE INDEX "Message_in_reply_to_idx" ON "Message"("in_reply_to");

-- CreateIndex
CREATE INDEX "Message_references_header_idx" ON "Message"("references_header");

-- CreateIndex
CREATE INDEX "Quotation_conversation_id_idx" ON "Quotation"("conversation_id");

-- CreateIndex
CREATE INDEX "RFQ_conversation_id_idx" ON "RFQ"("conversation_id");

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistancePurchaseOrder" ADD CONSTRAINT "AssistancePurchaseOrder_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistancePurchaseOrder" ADD CONSTRAINT "AssistancePurchaseOrder_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistancePurchaseOrder" ADD CONSTRAINT "AssistancePurchaseOrder_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistancePurchaseOrder" ADD CONSTRAINT "AssistancePurchaseOrder_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceTicket" ADD CONSTRAINT "AssistanceTicket_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceTicket" ADD CONSTRAINT "AssistanceTicket_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceTicket" ADD CONSTRAINT "AssistanceTicket_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceTicket" ADD CONSTRAINT "AssistanceTicket_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
