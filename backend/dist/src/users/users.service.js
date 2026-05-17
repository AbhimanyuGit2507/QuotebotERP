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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.user.findMany({
            where: { tenant_id: tenantId },
            include: { role: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        const user = await this.prisma.user.findFirst({
            where: { id, tenant_id: tenantId },
            include: { role: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async getRoleByName(roleName) {
        const role = await this.prisma.role.findUnique({
            where: { name: roleName },
        });
        if (!role) {
            throw new common_1.BadRequestException('Invalid role');
        }
        return role;
    }
    async create(tenantId, body) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: body.email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const role = await this.getRoleByName(body.role ?? 'user');
        const password_hash = await bcrypt.hash(body.password, 10);
        return this.prisma.user.create({
            data: {
                tenant_id: tenantId,
                email: body.email,
                name: body.name,
                password_hash,
                role_id: role.id,
                status: body.status ?? 'active',
            },
            include: { role: true },
        });
    }
    async update(id, tenantId, body) {
        await this.findOne(id, tenantId);
        const role = body.role ? await this.getRoleByName(body.role) : null;
        const password_hash = body.password
            ? await bcrypt.hash(body.password, 10)
            : undefined;
        return this.prisma.user.update({
            where: { id },
            data: {
                ...(body.email ? { email: body.email } : {}),
                ...(body.name ? { name: body.name } : {}),
                ...(body.status ? { status: body.status } : {}),
                ...(role ? { role: { connect: { id: role.id } } } : {}),
                ...(password_hash ? { password_hash } : {}),
                ...(body.permissions !== undefined
                    ? { permissions: body.permissions }
                    : {}),
            },
            include: { role: true },
        });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map