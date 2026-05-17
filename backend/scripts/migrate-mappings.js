require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
  const dir = path.resolve(process.cwd(), '.runlogs', 'integration_mappings');
  if (!fs.existsSync(dir)) {
    console.log('No .runlogs/integration_mappings directory found, nothing to migrate');
    process.exit(0);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  console.log('Found mapping files:', files);

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const data = JSON.parse(content);
      // file assumed to be keyed by tenant/provider -> entries
      for (const entry of data || []) {
        // entry should contain: tenantId, provider, externalId, localEntity, localId
        const exists = await prisma.integrationMapping.findFirst({ where: { tenant_id: entry.tenantId || entry.tenant_id, provider: entry.provider, external_id: entry.externalId || entry.external_id, local_entity: entry.localEntity || entry.local_entity } });
        if (!exists) {
          await prisma.integrationMapping.create({ data: {
            tenant_id: entry.tenantId || entry.tenant_id,
            provider: entry.provider,
            external_id: entry.externalId || entry.external_id,
            local_entity: entry.localEntity || entry.local_entity,
            local_id: entry.localId || entry.local_id,
          }});
          console.log('Inserted mapping from', file, entry.externalId || entry.external_id);
        } else {
          console.log('Skipping existing mapping', entry.externalId || entry.external_id);
        }
      }
    } catch (err) {
      console.error('Failed to migrate file', file, err);
    }
  }

  console.log('Migration complete');
  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
