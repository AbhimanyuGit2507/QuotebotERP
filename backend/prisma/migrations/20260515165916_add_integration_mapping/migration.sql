-- CreateTable
CREATE TABLE "IntegrationMapping" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "local_entity" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationMapping_tenant_id_idx" ON "IntegrationMapping"("tenant_id");

-- CreateIndex
CREATE INDEX "IntegrationMapping_provider_external_id_idx" ON "IntegrationMapping"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationMapping_tenant_id_provider_external_id_local_ent_key" ON "IntegrationMapping"("tenant_id", "provider", "external_id", "local_entity");

-- AddForeignKey
ALTER TABLE "IntegrationMapping" ADD CONSTRAINT "IntegrationMapping_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
