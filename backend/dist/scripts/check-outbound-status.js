"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn'],
    });
    try {
        const prisma = app.get(prisma_service_1.PrismaService);
        const rows = await prisma.outboundEmail.findMany({
            orderBy: { created_at: 'desc' },
            take: 10,
            select: {
                id: true,
                status: true,
                attempts: true,
                provider: true,
                last_error: true,
                to: true,
                subject: true,
                created_at: true,
                sent_at: true,
                updated_at: true,
            },
        });
        console.log(JSON.stringify(rows, null, 2));
    }
    finally {
        await app.close();
    }
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
//# sourceMappingURL=check-outbound-status.js.map