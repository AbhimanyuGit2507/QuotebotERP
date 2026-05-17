-- Enforce dedup for inbound emails at database level.
CREATE UNIQUE INDEX "Message_email_account_id_external_id_key"
ON "Message"("email_account_id", "external_id");
