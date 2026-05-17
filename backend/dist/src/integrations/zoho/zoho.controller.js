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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoController = void 0;
const common_1 = require("@nestjs/common");
const zoho_service_1 = require("./zoho.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let ZohoController = class ZohoController {
    zohoService;
    constructor(zohoService) {
        this.zohoService = zohoService;
    }
    getAuthUrl(req) {
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.id;
        return this.zohoService.getAuthorizationUrl(tenantId, userId);
    }
    async callback(code, state) {
        return this.zohoService.handleCallback(code, state);
    }
    async exchangeCode(body) {
        return this.zohoService.exchangeCode(body.code, body.tenant_id);
    }
    async listCustomers(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        return this.zohoService.listCustomers(tenantId);
    }
    async listItems(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        return this.zohoService.listItems(tenantId);
    }
    async importCustomers(req, body) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        return this.zohoService.importCustomers(tenantId, body?.overrides || []);
    }
    async importItems(req, body) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        return this.zohoService.importItems(tenantId, body?.overrides || []);
    }
    async previewCustomers(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        const resp = await this.zohoService.listCustomers(tenantId);
        if (!resp.ok)
            return resp;
        const payload = resp.data;
        const contacts = Array.isArray(payload?.contacts)
            ? payload.contacts
            : Array.isArray(payload?.data)
                ? payload.data
                : [];
        const getString = (v) => (typeof v === 'string' ? v : null);
        const mappings = contacts.map((contact) => {
            const item = contact;
            const externalId = getString(item.contact_id ?? item.contact_id);
            const name = getString(item.contact_name ?? item.name);
            let email = getString(item.email);
            const contactPersons = item.contact_persons;
            if (!email && Array.isArray(contactPersons) && contactPersons[0]) {
                const firstPerson = contactPersons[0];
                email = getString(firstPerson.email);
            }
            return { externalId, name, email };
        });
        return { ok: true, rows: mappings };
    }
    async previewItems(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenant id');
        const resp = await this.zohoService.listItems(tenantId);
        if (!resp.ok)
            return resp;
        const payload = resp.data;
        const items = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
                ? payload.data
                : [];
        const getString = (v) => (typeof v === 'string' ? v : null);
        const getNumber = (v) => typeof v === 'number' ? v : Number(v) || 0;
        const rows = items.map((item) => {
            const it = item;
            const sku = getString(it.sku ?? it.item_code ?? it.code ?? it.name);
            return {
                externalId: getString(it.item_id),
                sku,
                name: getString(it.name ?? it.item_name),
                price: getNumber(it.rate ?? it.list_price ?? 0),
            };
        });
        return { ok: true, rows };
    }
};
exports.ZohoController = ZohoController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('auth-url'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)('exchange'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "exchangeCode", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('customers'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "listCustomers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('items'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "listItems", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('import/customers'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "importCustomers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('import/items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "importItems", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('preview/customers'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "previewCustomers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('preview/items'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "previewItems", null);
exports.ZohoController = ZohoController = __decorate([
    (0, common_1.Controller)('integrations/zoho'),
    __metadata("design:paramtypes", [zoho_service_1.ZohoService])
], ZohoController);
//# sourceMappingURL=zoho.controller.js.map