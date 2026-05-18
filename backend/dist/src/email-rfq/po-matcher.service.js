"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoMatcherService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let PoMatcherService = class PoMatcherService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalize(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    async scorePurchaseOrder(params) {
        const { tenantId, conversationId, messageBody, messageSubject, poRecordId, quotationId, } = params;
        const weights = {
            thread_match: 30,
            quote_number_match: 25,
            customer_match: 15,
            sku_match: 15,
            amount_match: 10,
            domain_match: 5,
        };
        let threadMatch = 0;
        let quoteNumberMatch = 0;
        let customerMatch = 0;
        let skuMatch = 0;
        let amountMatch = 0;
        let domainMatch = 0;
        if (quotationId) {
            const quotation = await this.prisma.quotation.findFirst({
                where: { tenant_id: tenantId, id: quotationId },
                select: {
                    conversation_id: true,
                    client_id: true,
                    total: true,
                    items: true,
                },
            });
            if (quotation?.conversation_id &&
                quotation.conversation_id === conversationId) {
                threadMatch = 1;
            }
            if (quotation?.client_id) {
                const client = await this.prisma.client.findFirst({
                    where: { tenant_id: tenantId, id: quotation.client_id },
                    select: { email: true },
                });
                if (client?.email) {
                    const cDomain = String(client.email).split('@').pop() || '';
                    const msgDomain = String(messageBody).match(/@([a-z0-9.-]+)\b/i)?.[1] ||
                        String(messageSubject || '').match(/@([a-z0-9.-]+)\b/i)?.[1] ||
                        '';
                    if (cDomain && msgDomain && cDomain === msgDomain)
                        domainMatch = 1;
                }
            }
            if (quotation?.items &&
                Array.isArray(quotation.items) &&
                quotation.items.length > 0) {
                const bodyNorm = this.normalize(messageBody);
                let hits = 0;
                for (const it of quotation.items) {
                    const name = String(it.product_name || it.name || '').trim();
                    if (!name)
                        continue;
                    const nname = this.normalize(name);
                    if (nname.length > 2 && bodyNorm.includes(nname))
                        hits += 1;
                }
                skuMatch = Math.min(1, hits / Math.max(quotation.items.length, 1));
            }
            const quotationTotal = Number(quotation?.total || 0);
            if (quotationTotal > 0) {
                const numbers = Array.from(String(messageBody || '').matchAll(/\b(\d{1,3}(?:[,\d]{0,}|)\.?\d{0,2})\b/g))
                    .map((m) => parseFloat((m[1] || '').replace(/,/g, '')))
                    .filter((n) => Number.isFinite(n) && n > 0);
                if (numbers.length > 0) {
                    const candidate = Math.max(...numbers);
                    const diff = Math.abs(candidate - quotationTotal);
                    const rel = quotationTotal > 0 ? diff / quotationTotal : 1;
                    amountMatch = rel <= 0.02 ? 1 : rel <= 0.1 ? 0.6 : 0;
                }
            }
            if (poRecordId) {
                const po = await this.prisma.assistancePurchaseOrder.findFirst({
                    where: { id: poRecordId, tenant_id: tenantId },
                    select: { po_number: true },
                });
                if (po?.po_number && quotationId) {
                    const quotationRec = await this.prisma.quotation.findFirst({
                        where: { tenant_id: tenantId, id: quotationId },
                        select: { number: true },
                    });
                    if (quotationRec?.number && po.po_number === quotationRec.number)
                        quoteNumberMatch = 1;
                }
            }
        }
        if (!customerMatch && quotationId) {
            const quotation = await this.prisma.quotation.findFirst({
                where: { tenant_id: tenantId, id: quotationId },
                select: { client_id: true },
            });
            if (quotation?.client_id) {
                const client = await this.prisma.client.findFirst({
                    where: { tenant_id: tenantId, id: quotation.client_id },
                    select: { email: true },
                });
                if (client?.email) {
                    const email = String(client.email).toLowerCase();
                    if (String(messageBody || '')
                        .toLowerCase()
                        .includes(email) ||
                        String(messageSubject || '')
                            .toLowerCase()
                            .includes(email)) {
                        customerMatch = 1;
                    }
                }
            }
        }
        const scoreRaw = threadMatch * weights.thread_match +
            quoteNumberMatch * weights.quote_number_match +
            customerMatch * weights.customer_match +
            skuMatch * weights.sku_match +
            amountMatch * weights.amount_match +
            domainMatch * weights.domain_match;
        const percent = Math.round((scoreRaw / 100) * 100);
        return {
            percent,
            components: {
                threadMatch,
                quoteNumberMatch,
                customerMatch,
                skuMatch,
                amountMatch,
                domainMatch,
            },
        };
    }
};
exports.PoMatcherService = PoMatcherService;
exports.PoMatcherService = PoMatcherService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PoMatcherService);
//# sourceMappingURL=po-matcher.service.js.map