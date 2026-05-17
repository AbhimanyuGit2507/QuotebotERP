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
exports.AccountingIntegrationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const tokenCrypto_1 = require("../utils/tokenCrypto");
let AccountingIntegrationsService = class AccountingIntegrationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    ensureXeroConfigured() {
        const clientId = process.env.XERO_CLIENT_ID;
        const clientSecret = process.env.XERO_CLIENT_SECRET;
        const tenantId = process.env.XERO_TENANT_ID;
        const redirectUri = process.env.XERO_REDIRECT_URI;
        if (!clientId || !clientSecret || !tenantId || !redirectUri) {
            throw new common_1.BadRequestException('Xero integration is not configured');
        }
        return { clientId, clientSecret, tenantId, redirectUri };
    }
    ensureQuickBooksConfigured() {
        const clientId = process.env.QUICKBOOKS_CLIENT_ID;
        const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
        const realmId = process.env.QUICKBOOKS_REALM_ID;
        const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
        if (!clientId || !clientSecret || !realmId || !redirectUri) {
            throw new common_1.BadRequestException('QuickBooks integration is not configured');
        }
        return { clientId, clientSecret, realmId, redirectUri };
    }
    encodeState(data) {
        return Buffer.from(JSON.stringify(data)).toString('base64url');
    }
    decodeState(value) {
        if (!value)
            return null;
        try {
            return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        }
        catch {
            return null;
        }
    }
    parseTokenResponse(payload) {
        return payload && typeof payload === 'object'
            ? payload
            : {};
    }
    async getStatus(tenantId) {
        const rows = await this.prisma.accountingIntegration.findMany({
            where: { tenant_id: tenantId },
            select: {
                provider: true,
                status: true,
                expires_at: true,
                updated_at: true,
            },
        });
        const statusByProvider = rows.reduce((acc, row) => {
            if (row.provider === 'xero' || row.provider === 'quickbooks') {
                acc[row.provider] = {
                    ...row,
                    provider: row.provider,
                };
            }
            return acc;
        }, {});
        return {
            xero: statusByProvider.xero || null,
            quickbooks: statusByProvider.quickbooks || null,
        };
    }
    getXeroAuthorizeUrl(tenantId, userId) {
        const { clientId, redirectUri } = this.ensureXeroConfigured();
        const state = this.encodeState({ tenantId, userId, provider: 'xero' });
        const scope = process.env.XERO_SCOPES ||
            'offline_access accounting.transactions openid profile email';
        const url = new URL('https://login.xero.com/identity/connect/authorize');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('scope', scope);
        url.searchParams.set('state', state);
        return { authorizationUrl: url.toString() };
    }
    getQuickBooksAuthorizeUrl(tenantId, userId) {
        const { clientId, redirectUri } = this.ensureQuickBooksConfigured();
        const state = this.encodeState({
            tenantId,
            userId,
            provider: 'quickbooks',
        });
        const scope = process.env.QUICKBOOKS_SCOPES ||
            'com.intuit.quickbooks.accounting openid profile email';
        const url = new URL('https://appcenter.intuit.com/connect/oauth2');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', scope);
        url.searchParams.set('state', state);
        return { authorizationUrl: url.toString() };
    }
    async handleXeroCallback(code, state) {
        const payload = this.decodeState(state);
        if (!payload?.tenantId) {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const { clientId, clientSecret, redirectUri, tenantId: xeroTenantId, } = this.ensureXeroConfigured();
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });
        if (!tokenResponse.ok) {
            throw new common_1.BadRequestException('Xero token exchange failed');
        }
        const tokenJson = this.parseTokenResponse(await tokenResponse.json());
        const accessToken = tokenJson.access_token;
        if (!accessToken) {
            throw new common_1.BadRequestException('Xero token response missing access token');
        }
        const expiresAt = tokenJson.expires_in
            ? new Date(Date.now() + tokenJson.expires_in * 1000)
            : undefined;
        const encRefresh = (0, tokenCrypto_1.encryptToken)(tokenJson.refresh_token);
        await this.prisma.accountingIntegration.upsert({
            where: {
                tenant_id_provider: { tenant_id: payload.tenantId, provider: 'xero' },
            },
            create: {
                tenant_id: payload.tenantId,
                provider: 'xero',
                access_token: accessToken,
                refresh_token: encRefresh,
                expires_at: expiresAt,
                scope: tokenJson.scope,
                tenant_external_id: xeroTenantId,
                status: 'connected',
            },
            update: {
                access_token: accessToken,
                refresh_token: encRefresh,
                expires_at: expiresAt,
                scope: tokenJson.scope,
                tenant_external_id: xeroTenantId,
                status: 'connected',
            },
        });
        return { success: true };
    }
    async handleQuickBooksCallback(code, state, realmId) {
        const payload = this.decodeState(state);
        if (!payload?.tenantId) {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const { clientId, clientSecret, redirectUri, realmId: configuredRealm, } = this.ensureQuickBooksConfigured();
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });
        if (!tokenResponse.ok) {
            throw new common_1.BadRequestException('QuickBooks token exchange failed');
        }
        const tokenJson = this.parseTokenResponse(await tokenResponse.json());
        const accessToken = tokenJson.access_token;
        if (!accessToken) {
            throw new common_1.BadRequestException('QuickBooks token response missing access token');
        }
        const expiresAt = tokenJson.expires_in
            ? new Date(Date.now() + tokenJson.expires_in * 1000)
            : undefined;
        const encRefresh2 = (0, tokenCrypto_1.encryptToken)(tokenJson.refresh_token);
        await this.prisma.accountingIntegration.upsert({
            where: {
                tenant_id_provider: {
                    tenant_id: payload.tenantId,
                    provider: 'quickbooks',
                },
            },
            create: {
                tenant_id: payload.tenantId,
                provider: 'quickbooks',
                access_token: accessToken,
                refresh_token: encRefresh2,
                expires_at: expiresAt,
                scope: tokenJson.scope,
                realm_id: realmId || configuredRealm,
                status: 'connected',
            },
            update: {
                access_token: accessToken,
                refresh_token: encRefresh2,
                expires_at: expiresAt,
                scope: tokenJson.scope,
                realm_id: realmId || configuredRealm,
                status: 'connected',
            },
        });
        return { success: true };
    }
    async exportInvoiceToXero(tenantId, invoiceId) {
        this.ensureXeroConfigured();
        const integration = await this.prisma.accountingIntegration.findFirst({
            where: { tenant_id: tenantId, provider: 'xero', status: 'connected' },
        });
        if (!integration) {
            throw new common_1.BadRequestException('Xero integration not connected');
        }
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenant_id: tenantId },
            include: {
                quotation: { include: { items: true, client: true } },
                payments: true,
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        const accountCode = process.env.XERO_SALES_ACCOUNT_CODE || '200';
        const lineItems = (invoice.quotation?.items || []).map((item) => ({
            Description: item.product_name,
            Quantity: Number(item.quantity || 0),
            UnitAmount: Number(item.unit_price || 0),
            AccountCode: accountCode,
        }));
        const payload = {
            Invoices: [
                {
                    Type: 'ACCREC',
                    Contact: { Name: invoice.quotation?.client?.name || 'Customer' },
                    Date: invoice.date,
                    DueDate: invoice.due_date || invoice.date,
                    Reference: invoice.number,
                    CurrencyCode: invoice.currency,
                    LineItems: lineItems.length
                        ? lineItems
                        : [
                            {
                                Description: `Invoice ${invoice.number}`,
                                Quantity: 1,
                                UnitAmount: Number(invoice.total || 0),
                                AccountCode: accountCode,
                            },
                        ],
                },
            ],
        };
        const exportRow = await this.prisma.accountingExport.create({
            data: {
                tenant_id: tenantId,
                invoice_id: invoice.id,
                provider: 'xero',
                status: 'queued',
                request_json: payload,
            },
        });
        const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
                'xero-tenant-id': integration.tenant_external_id || '',
            },
            body: JSON.stringify(payload),
        });
        const responseJson = (await response
            .json()
            .catch(() => ({})));
        const status = response.ok ? 'success' : 'failed';
        const externalId = responseJson.Invoices?.[0]?.InvoiceID;
        await this.prisma.accountingExport.update({
            where: { id: exportRow.id },
            data: {
                status,
                response_json: responseJson,
                external_id: externalId,
                error_message: response.ok ? undefined : 'Xero export failed',
            },
        });
        return {
            provider: 'xero',
            status,
            message: response.ok ? 'Invoice exported to Xero' : 'Xero export failed',
            export_id: exportRow.id,
            external_id: externalId,
        };
    }
    async exportInvoiceToQuickBooks(tenantId, invoiceId) {
        this.ensureQuickBooksConfigured();
        const integration = await this.prisma.accountingIntegration.findFirst({
            where: {
                tenant_id: tenantId,
                provider: 'quickbooks',
                status: 'connected',
            },
        });
        if (!integration) {
            throw new common_1.BadRequestException('QuickBooks integration not connected');
        }
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenant_id: tenantId },
            include: {
                quotation: { include: { items: true, client: true } },
                payments: true,
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        const lineItems = (invoice.quotation?.items || []).map((item) => ({
            DetailType: 'DescriptionOnly',
            Amount: Number(item.total || 0),
            Description: item.product_name,
            DescriptionLineDetail: {},
        }));
        const payload = {
            DocNumber: invoice.number,
            TxnDate: invoice.date,
            CurrencyRef: { value: invoice.currency },
            CustomerRef: { name: invoice.quotation?.client?.name || 'Customer' },
            Line: lineItems.length
                ? lineItems
                : [
                    {
                        DetailType: 'DescriptionOnly',
                        Amount: Number(invoice.total || 0),
                        Description: `Invoice ${invoice.number}`,
                        DescriptionLineDetail: {},
                    },
                ],
        };
        const exportRow = await this.prisma.accountingExport.create({
            data: {
                tenant_id: tenantId,
                invoice_id: invoice.id,
                provider: 'quickbooks',
                status: 'queued',
                request_json: payload,
            },
        });
        const realmId = integration.realm_id || process.env.QUICKBOOKS_REALM_ID || '';
        const response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const responseJson = (await response
            .json()
            .catch(() => ({})));
        const status = response.ok ? 'success' : 'failed';
        const externalId = responseJson.Invoice?.Id;
        await this.prisma.accountingExport.update({
            where: { id: exportRow.id },
            data: {
                status,
                response_json: responseJson,
                external_id: externalId,
                error_message: response.ok ? undefined : 'QuickBooks export failed',
            },
        });
        return {
            provider: 'quickbooks',
            status,
            message: response.ok
                ? 'Invoice exported to QuickBooks'
                : 'QuickBooks export failed',
            export_id: exportRow.id,
            external_id: externalId,
        };
    }
};
exports.AccountingIntegrationsService = AccountingIntegrationsService;
exports.AccountingIntegrationsService = AccountingIntegrationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountingIntegrationsService);
exports.default = AccountingIntegrationsService;
//# sourceMappingURL=accounting-integrations.service.js.map