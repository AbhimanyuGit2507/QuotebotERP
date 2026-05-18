"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = __importDefault(require("path"));
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("../prisma.service");
const env_util_1 = require("./utils/env.util");
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    path_1.default.resolve(__dirname, '..', '..', '.env'),
                    path_1.default.resolve(process.cwd(), '.env'),
                ],
            }),
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: (0, env_util_1.requireEnv)('JWT_SECRET'),
                signOptions: {
                    expiresIn: (process.env.JWT_EXPIRATION || '24h'),
                },
            }),
        ],
        providers: [prisma_service_1.PrismaService],
        exports: [prisma_service_1.PrismaService, config_1.ConfigModule, jwt_1.JwtModule],
    })
], CommonModule);
//# sourceMappingURL=common.module.js.map