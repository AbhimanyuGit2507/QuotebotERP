"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma.service");
const email_service_1 = require("../src/email/email.service");
const email_rfq_service_1 = require("../src/email-rfq/email-rfq.service");
dotenv.config();
function tag() {
    return `provider-test-${Date.now()}`;
}
function providerLabel(provider) {
    return provider.toUpperCase();
}
async function main() {
    const runTag = tag();
    const providers = ['groq', 'cerebras', 'gemini'];
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn'],
    });
    try {
        const prisma = app.get(prisma_service_1.PrismaService);
        const emailService = app.get(email_service_1.EmailService);
        const emailRfqService = app.get(email_rfq_service_1.EmailRfqService);
        const tenant = await prisma.tenant.findFirst({
            orderBy: { created_at: 'desc' },
        });
        if (!tenant) {
            throw new Error('No tenant found. Run backend seed first.');
        }
        const user = await prisma.user.findFirst({
            where: { tenant_id: tenant.id },
            orderBy: { created_at: 'asc' },
        });
        if (!user) {
            throw new Error(`No user found for tenant ${tenant.id}.`);
        }
        const emailAccount = await prisma.emailAccount.create({
            data: {
                tenant_id: tenant.id,
                user_id: user.id,
                provider: 'gmail',
                email_address: `rfq-test-${runTag}@quotebot.local`,
                credentials: {
                    access_token: 'dummy-token',
                    refresh_token: 'dummy-refresh',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                is_active: true,
            },
        });
        for (const provider of providers) {
            process.env.RFQ_LLM_FALLBACK_ORDER = provider;
            const subject = `RFQ inquiry ${providerLabel(provider)} ${runTag}`;
            const body = [
                'Hi team,',
                'Please send a quotation for the following items.',
                'We need pricing and availability.',
                'Thanks!',
            ].join('\n');
            const externalId = `${runTag}-${provider}-ext`;
            await emailService.processInboundEmail(tenant.id, {
                email_account_id: emailAccount.id,
                external_id: externalId,
                thread_id: `${runTag}-${provider}-thread`,
                provider: 'gmail',
                sender_email: `buyer-${provider}@example.com`,
                sender_name: `Buyer ${providerLabel(provider)}`,
                subject,
                body,
                received_at: new Date().toISOString(),
                raw_payload: {
                    body_text: body,
                    body_html: '',
                    source: 'test-email-rfq-per-provider-script',
                    provider,
                },
            });
            const result = await emailRfqService.processPendingMessages({
                tenantId: tenant.id,
                limit: 50,
            });
            const processed = await prisma.message.findFirst({
                where: {
                    tenant_id: tenant.id,
                    external_id: externalId,
                },
                select: {
                    processing_status: true,
                    raw_payload: true,
                },
            });
            const payload = processed?.raw_payload &&
                typeof processed.raw_payload === 'object' &&
                !Array.isArray(processed.raw_payload)
                ? processed.raw_payload
                : {};
            console.log(`\n[${providerLabel(provider)}]`);
            console.log(`fallback_order=${process.env.RFQ_LLM_FALLBACK_ORDER}`);
            console.log(`status=${processed?.processing_status || 'unknown'}`);
            console.log(`parsing_source=${String(payload.parsing_source || '')}`);
            console.log(`pipeline_stage=${String(payload.pipeline_stage || '')}`);
            console.log(`parsing_error=${String(payload.parsing_error || '')}`);
            console.log(`summary=${JSON.stringify(result)}`);
        }
        console.log('\nDone. Messages are retained for inspection.');
    }
    finally {
        await app.close();
    }
}
void main();
//# sourceMappingURL=test-email-rfq-per-provider.js.map