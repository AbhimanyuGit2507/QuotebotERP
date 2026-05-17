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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ZohoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../prisma.service");
const tokenCrypto_1 = require("../../utils/tokenCrypto");
let ZohoService = ZohoService_1 = class ZohoService {
    prisma;
    logger = new common_1.Logger(ZohoService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeExternalId(value) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed)
                return trimmed;
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            return String(value);
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value === null || value === undefined) {
            return Math.random().toString(36).slice(2);
        }
        if (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'bigint' ||
            typeof value === 'boolean') {
            return String(value).trim() || Math.random().toString(36).slice(2);
        }
        return JSON.stringify(value);
    }
    normalizeSku(value) {
        const normalized = this.normalizeExternalId(value);
        return normalized || 'unknown-sku';
    }
    isRecord(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }
    getString(value) {
        return typeof value === 'string' && value.trim() ? value : undefined;
    }
    getNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
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
    getAuthorizationUrl(tenantId, userId) {
        const base = process.env.ZOHO_REGION === 'in'
            ? 'https://accounts.zoho.in'
            : 'https://accounts.zoho.com';
        const clientId = process.env.ZOHO_CLIENT_ID || '';
        const redirect = encodeURIComponent(process.env.ZOHO_REDIRECT_URI || '');
        const scope = encodeURIComponent(process.env.ZOHO_SCOPE || 'ZohoBooks.fullaccess.ALL');
        const state = tenantId
            ? this.encodeState({ tenantId, userId: userId || '' })
            : undefined;
        const url = new URL(`${base}/oauth/v2/auth`);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('scope', decodeURIComponent(scope));
        url.searchParams.set('redirect_uri', decodeURIComponent(redirect));
        if (state)
            url.searchParams.set('state', state);
        return { authorizationUrl: url.toString() };
    }
    async handleCallback(code, state) {
        const payload = this.decodeState(state);
        const tenantId = payload?.tenantId;
        if (!tenantId) {
            throw new common_1.BadRequestException('Missing tenant in OAuth state');
        }
        return this.exchangeCode(code, tenantId);
    }
    async exchangeCode(code, tenantId) {
        this.logger.log('exchangeCode called with code=' + code + ' tenant=' + tenantId);
        const base = process.env.ZOHO_REGION === 'in'
            ? 'https://accounts.zoho.in'
            : 'https://accounts.zoho.com';
        const tokenUrl = `${base}/oauth/v2/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', process.env.ZOHO_CLIENT_ID || '');
        params.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
        params.append('redirect_uri', process.env.ZOHO_REDIRECT_URI || '');
        params.append('code', code);
        try {
            const resp = await axios_1.default.post(tokenUrl, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000,
            });
            const data = resp.data;
            if (tenantId) {
                const expiresIn = this.getNumber(data.expires_in);
                const accessToken = this.getString(data.access_token);
                const refreshToken = this.getString(data.refresh_token);
                const scope = this.getString(data.scope);
                const expiresAt = expiresIn
                    ? new Date(Date.now() + expiresIn * 1000)
                    : null;
                if (!accessToken) {
                    throw new common_1.BadRequestException('Zoho did not return an access token');
                }
                await this.prisma.accountingIntegration.upsert({
                    where: {
                        tenant_id_provider: { tenant_id: tenantId, provider: 'zoho' },
                    },
                    create: {
                        tenant_id: tenantId,
                        provider: 'zoho',
                        access_token: accessToken,
                        refresh_token: refreshToken ? (0, tokenCrypto_1.encryptToken)(refreshToken) : null,
                        expires_at: expiresAt,
                        scope,
                        status: 'connected',
                    },
                    update: {
                        access_token: accessToken,
                        refresh_token: refreshToken
                            ? (0, tokenCrypto_1.encryptToken)(refreshToken)
                            : undefined,
                        expires_at: expiresAt,
                        scope,
                        status: 'connected',
                    },
                });
            }
            return { ok: true, data };
        }
        catch (err) {
            this.logger.error('Zoho token exchange failed', err);
            return { ok: false, error: String(err) };
        }
    }
    zohoApiDomain() {
        if (process.env.ZOHO_API_DOMAIN)
            return process.env.ZOHO_API_DOMAIN;
        return process.env.ZOHO_REGION === 'in'
            ? 'https://www.zohoapis.in'
            : 'https://www.zohoapis.com';
    }
    async refreshAccessTokenIfNeeded(integration) {
        if (!integration)
            return integration;
        if (!integration.expires_at)
            return integration;
        const expiresAt = new Date(integration.expires_at);
        if (expiresAt.getTime() - Date.now() < 2 * 60 * 1000) {
            const tokenUrl = `${process.env.ZOHO_REGION === 'in' ? 'https://accounts.zoho.in' : 'https://accounts.zoho.com'}/oauth/v2/token`;
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('client_id', process.env.ZOHO_CLIENT_ID || '');
            params.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
            params.append('refresh_token', (0, tokenCrypto_1.decryptToken)(integration.refresh_token) || '');
            try {
                const resp = await axios_1.default.post(tokenUrl, params.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 10000,
                });
                const data = resp.data;
                const newExpires = data.expires_in
                    ? new Date(Date.now() + data.expires_in * 1000)
                    : null;
                integration = await this.prisma.accountingIntegration.update({
                    where: { id: integration.id },
                    data: {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token || integration.refresh_token,
                        expires_at: newExpires,
                    },
                });
            }
            catch (err) {
                this.logger.error('Zoho refresh failed', err);
            }
        }
        return integration;
    }
    async getIntegrationForTenant(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        const integration = await this.prisma.accountingIntegration.findFirst({
            where: { tenant_id: tenantId, provider: 'zoho', status: 'connected' },
        });
        if (!integration)
            throw new common_1.BadRequestException('Zoho integration not connected');
        const refreshed = await this.refreshAccessTokenIfNeeded(integration);
        if (!refreshed) {
            throw new common_1.BadRequestException('Zoho integration not connected');
        }
        return refreshed;
    }
    async listCustomers(tenantId) {
        const integration = await this.getIntegrationForTenant(tenantId);
        const apiDomain = this.zohoApiDomain();
        const orgId = process.env.ZOHO_ORG_ID || integration.tenant_external_id || '';
        const url = `${apiDomain}/books/v3/contacts` +
            (orgId ? `?organization_id=${orgId}` : '');
        try {
            const resp = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${integration.access_token}`,
                },
                timeout: 10000,
            });
            return { ok: true, data: resp.data };
        }
        catch (err) {
            this.logger.error('Zoho listCustomers failed', err);
            return { ok: false, error: String(err) };
        }
    }
    async listItems(tenantId) {
        const integration = await this.getIntegrationForTenant(tenantId);
        const apiDomain = this.zohoApiDomain();
        const orgId = process.env.ZOHO_ORG_ID || integration.tenant_external_id || '';
        const url = `${apiDomain}/books/v3/items` +
            (orgId ? `?organization_id=${orgId}` : '');
        try {
            const resp = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${integration.access_token}`,
                },
                timeout: 10000,
            });
            return { ok: true, data: resp.data };
        }
        catch (err) {
            this.logger.error('Zoho listItems failed', err);
            return { ok: false, error: String(err) };
        }
    }
    async importCustomers(tenantId, overrides = []) {
        const resp = await this.listCustomers(tenantId);
        if (!resp.ok)
            return { ok: false, error: 'Failed to fetch customers from Zoho' };
        const contacts = resp.data?.contacts || resp.data?.data || [];
        const results = { created: 0, updated: 0, skipped: 0, errors: [] };
        for (const ov of overrides || []) {
            try {
                const existingMap = await this.prisma.integrationMapping.findFirst({
                    where: {
                        tenant_id: tenantId,
                        provider: 'zoho',
                        external_id: ov.externalId,
                        local_entity: ov.localEntity,
                    },
                });
                if (existingMap) {
                    await this.prisma.integrationMapping.update({
                        where: { id: existingMap.id },
                        data: { local_id: ov.localId },
                    });
                }
                else {
                    await this.prisma.integrationMapping.create({
                        data: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: ov.externalId,
                            local_entity: ov.localEntity,
                            local_id: ov.localId,
                        },
                    });
                }
            }
            catch (err) {
                this.logger.warn('Failed to apply override', err);
            }
        }
        for (const c of contacts) {
            try {
                const externalId = c.contact_id ||
                    c.contact_id ||
                    c.contact_id ||
                    c.contact_id ||
                    String(c.contact_id || c.contact_id || Math.random()).toString();
                const mapping = await this.prisma.integrationMapping.findFirst({
                    where: {
                        tenant_id: tenantId,
                        provider: 'zoho',
                        external_id: externalId,
                        local_entity: 'Client',
                    },
                });
                const email = (c.email && String(c.email).toLowerCase()) ||
                    (c.contact_persons && c.contact_persons[0]?.email) ||
                    null;
                const name = c.contact_name || c.name || c.contact_name || 'Unknown';
                const phone = c.phone ||
                    c.mobile ||
                    (c.contact_persons && c.contact_persons[0]?.phone) ||
                    null;
                const website = c.website || null;
                const tenant_id = tenantId;
                if (mapping && mapping.local_id) {
                    const existing = await this.prisma.client.findUnique({
                        where: { id: mapping.local_id },
                    });
                    if (existing) {
                        await this.prisma.client.update({
                            where: { id: existing.id },
                            data: { name, phone, website, updated_at: new Date() },
                        });
                        results.updated += 1;
                        continue;
                    }
                }
                const safeEmail = email || `zoho-${externalId}@zoho-import.local`;
                const existingByEmail = await this.prisma.client.findFirst({
                    where: { tenant_id, email: safeEmail },
                });
                if (existingByEmail) {
                    await this.prisma.client.update({
                        where: { id: existingByEmail.id },
                        data: { name, phone, website, updated_at: new Date() },
                    });
                    const existingMap = await this.prisma.integrationMapping.findFirst({
                        where: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: externalId,
                            local_entity: 'Client',
                        },
                    });
                    if (existingMap) {
                        await this.prisma.integrationMapping.update({
                            where: { id: existingMap.id },
                            data: { local_id: existingByEmail.id },
                        });
                    }
                    else {
                        await this.prisma.integrationMapping.create({
                            data: {
                                tenant_id: tenantId,
                                provider: 'zoho',
                                external_id: externalId,
                                local_entity: 'Client',
                                local_id: existingByEmail.id,
                            },
                        });
                    }
                    results.updated += 1;
                }
                else {
                    const created = await this.prisma.client.create({
                        data: {
                            tenant_id,
                            name,
                            email: safeEmail,
                            phone,
                            website,
                            type: 'B2B',
                        },
                    });
                    await this.prisma.integrationMapping.create({
                        data: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: externalId,
                            local_entity: 'Client',
                            local_id: created.id,
                        },
                    });
                    results.created += 1;
                }
            }
            catch (err) {
                results.errors.push({ item: c, error: String(err) });
            }
        }
        return { ok: true, results };
    }
    async importItems(tenantId, overrides = []) {
        const resp = await this.listItems(tenantId);
        if (!resp.ok)
            return { ok: false, error: 'Failed to fetch items from Zoho' };
        const items = resp.data?.items || resp.data?.data || [];
        const results = { created: 0, updated: 0, skipped: 0, errors: [] };
        for (const ov of overrides || []) {
            try {
                const existingMap = await this.prisma.integrationMapping.findFirst({
                    where: {
                        tenant_id: tenantId,
                        provider: 'zoho',
                        external_id: ov.externalId,
                        local_entity: ov.localEntity,
                    },
                });
                if (existingMap) {
                    await this.prisma.integrationMapping.update({
                        where: { id: existingMap.id },
                        data: { local_id: ov.localId },
                    });
                }
                else {
                    await this.prisma.integrationMapping.create({
                        data: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: ov.externalId,
                            local_entity: ov.localEntity,
                            local_id: ov.localId,
                        },
                    });
                }
            }
            catch (err) {
                this.logger.warn('Failed to apply override', err);
            }
        }
        for (const it of items) {
            try {
                const externalId = this.normalizeExternalId(it.item_id);
                const mapping = await this.prisma.integrationMapping.findFirst({
                    where: {
                        tenant_id: tenantId,
                        provider: 'zoho',
                        external_id: externalId,
                        local_entity: 'Product',
                    },
                });
                const sku = this.normalizeSku(it.sku || it.item_code || it.code || it.name);
                const name = it.name || it.item_name || 'Unknown';
                const price = Number(it.rate || it.list_price || 0) || 0;
                const tenant_id = tenantId;
                if (mapping && mapping.local_id) {
                    const existingById = await this.prisma.product.findUnique({
                        where: { id: mapping.local_id },
                    });
                    if (existingById) {
                        await this.prisma.product.update({
                            where: { id: existingById.id },
                            data: { name, price, updated_at: new Date() },
                        });
                        results.updated += 1;
                        continue;
                    }
                }
                const existing = await this.prisma.product.findFirst({
                    where: { tenant_id, sku },
                });
                if (existing) {
                    await this.prisma.product.update({
                        where: { id: existing.id },
                        data: { name, price, updated_at: new Date() },
                    });
                    const existingMap = await this.prisma.integrationMapping.findFirst({
                        where: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: externalId,
                            local_entity: 'Product',
                        },
                    });
                    if (existingMap) {
                        await this.prisma.integrationMapping.update({
                            where: { id: existingMap.id },
                            data: { local_id: existing.id },
                        });
                    }
                    else {
                        await this.prisma.integrationMapping.create({
                            data: {
                                tenant_id: tenantId,
                                provider: 'zoho',
                                external_id: externalId,
                                local_entity: 'Product',
                                local_id: existing.id,
                            },
                        });
                    }
                    results.updated += 1;
                }
                else {
                    let categoryId;
                    const defaultCat = await this.prisma.productCategory.findFirst({
                        where: { tenant_id, name: 'Imported' },
                    });
                    if (defaultCat)
                        categoryId = defaultCat.id;
                    else {
                        const cat = await this.prisma.productCategory.create({
                            data: { tenant_id, name: 'Imported' },
                        });
                        categoryId = cat.id;
                    }
                    const created = await this.prisma.product.create({
                        data: {
                            tenant_id,
                            sku,
                            name,
                            price,
                            category_id: categoryId,
                            unit: 'pcs',
                            cost: 0,
                            stock: 0,
                        },
                    });
                    await this.prisma.integrationMapping.create({
                        data: {
                            tenant_id: tenantId,
                            provider: 'zoho',
                            external_id: externalId,
                            local_entity: 'Product',
                            local_id: created.id,
                        },
                    });
                    results.created += 1;
                }
            }
            catch (err) {
                results.errors.push({ item: it, error: String(err) });
            }
        }
        return { ok: true, results };
    }
};
exports.ZohoService = ZohoService;
exports.ZohoService = ZohoService = ZohoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ZohoService);
//# sourceMappingURL=zoho.service.js.map