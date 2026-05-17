-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "email_account_id" TEXT,
ADD COLUMN     "thread_id" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'inbound',
ADD COLUMN     "email_account_id" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "is_processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processing_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "raw_payload" JSONB,
ADD COLUMN     "thread_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "credentials" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email_account_id" TEXT NOT NULL,
    "to" JSONB NOT NULL,
    "cc" JSONB,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAccount_tenant_id_idx" ON "EmailAccount"("tenant_id");

-- CreateIndex
CREATE INDEX "EmailAccount_user_id_idx" ON "EmailAccount"("user_id");

-- CreateIndex
CREATE INDEX "EmailAccount_provider_idx" ON "EmailAccount"("provider");

-- CreateIndex
CREATE INDEX "EmailAccount_is_active_idx" ON "EmailAccount"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_tenant_id_user_id_email_address_key" ON "EmailAccount"("tenant_id", "user_id", "email_address");

-- CreateIndex
CREATE INDEX "OutboundEmail_tenant_id_idx" ON "OutboundEmail"("tenant_id");

-- CreateIndex
CREATE INDEX "OutboundEmail_email_account_id_idx" ON "OutboundEmail"("email_account_id");

-- CreateIndex
CREATE INDEX "OutboundEmail_status_idx" ON "OutboundEmail"("status");

-- CreateIndex
CREATE INDEX "OutboundEmail_created_at_idx" ON "OutboundEmail"("created_at");

-- CreateIndex
CREATE INDEX "Conversation_email_account_id_idx" ON "Conversation"("email_account_id");

-- CreateIndex
CREATE INDEX "Conversation_thread_id_idx" ON "Conversation"("thread_id");

-- CreateIndex
CREATE INDEX "Message_email_account_id_idx" ON "Message"("email_account_id");

-- CreateIndex
CREATE INDEX "Message_external_id_idx" ON "Message"("external_id");

-- CreateIndex
CREATE INDEX "Message_is_processed_idx" ON "Message"("is_processed");

-- CreateIndex
CREATE INDEX "Message_processing_status_idx" ON "Message"("processing_status");

-- CreateIndex
CREATE INDEX "Message_direction_idx" ON "Message"("direction");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
