"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_1.json)({ limit: '10mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '10mb' }));
    app.use((0, cookie_parser_1.default)());
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, origin ?? true);
                return;
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Internal-Key',
            'X-Tenant-ID',
        ],
    });
    app.setGlobalPrefix(process.env.API_PREFIX || 'api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
            const formattedErrors = errors.reduce((acc, err) => {
                if (err.constraints) {
                    acc[err.property] = Object.values(err.constraints).join(', ');
                }
                return acc;
            }, {});
            return new common_1.BadRequestException({
                statusCode: 400,
                message: 'Validation failed',
                errors: formattedErrors,
            });
        },
    }));
    const port = process.env.PORT || process.env.API_PORT || 3001;
    await app.listen(port);
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`✅ Quotebot Backend API running on port ${port}`);
    console.log(`📍 API Prefix: /${process.env.API_PREFIX || 'api'}`);
    console.log(`🔗 Base URL: http://localhost:${port}/api`);
    console.log('═══════════════════════════════════════════════════\n');
}
bootstrap().catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map