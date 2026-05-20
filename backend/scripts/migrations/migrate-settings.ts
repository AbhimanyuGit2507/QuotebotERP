#!/usr/bin/env node
// Simple migration helper to copy typed settings into the new `Setting` model.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const rawDb = process.env.DATABASE_URL || '';
const connectionString = rawDb.replace(/^\"|\"$/g, '');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Starting settings migration...');

  // Example: migrate ItemMatchConfig rows into namespace `item_match.config`
  const configs = await prisma.itemMatchConfig.findMany();

  for (const cfg of configs) {
    const tenantId = cfg.tenant_id;
    const namespace = 'item_match.config';
    const payload = {
      suggestion_threshold: cfg.suggestion_threshold,
      auto_accept_threshold: cfg.auto_accept_threshold,
      semantic_reranker_enabled: cfg.semantic_reranker_enabled,
      semantic_model_name: cfg.semantic_model_name,
      semantic_weight: cfg.semantic_weight,
      mode: cfg.mode,
    } as any;

    for (const key of Object.keys(payload)) {
      await prisma.setting.upsert({
        where: { tenant_id_namespace_key: { tenant_id: tenantId, namespace, key } },
        update: { value: payload[key] },
        create: { tenant_id: tenantId, namespace, key, value: payload[key] },
      });
    }
    console.log(`Migrated ItemMatchConfig for tenant ${tenantId}`);
  }

  console.log('Settings migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
