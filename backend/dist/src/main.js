"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const app_logger_service_1 = require("./common/logger/app-logger.service");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new app_logger_service_1.AppLoggerService();
    app.useLogger(logger);
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.use((0, helmet_1.default)());
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
            'X-Requested-With',
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
    const config = new swagger_1.DocumentBuilder()
        .setTitle('QuotebotERP API')
        .setDescription('API documentation for QuotebotERP - AI-Powered ERP for Modern Businesses')
        .setVersion('1.0')
        .addCookieAuth('qb_access_token')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/swagger', app, document);
    const port = process.env.PORT || process.env.API_PORT || 3001;
    await app.listen(port);
    const startupLogger = new common_1.Logger('Bootstrap');
    startupLogger.log('═══════════════════════════════════════════════════');
    startupLogger.log(`✅ Quotebot Backend API running on port ${port}`);
    startupLogger.log(`📍 API Prefix: /${process.env.API_PREFIX || 'api'}`);
    startupLogger.log(`🔗 Base URL: http://localhost:${port}/api`);
    startupLogger.log('═══════════════════════════════════════════════════');
}
bootstrap().catch((err) => {
    const errorLogger = new common_1.Logger('Bootstrap');
    errorLogger.error('❌ Failed to start server:', err instanceof Error ? err.stack : String(err));
    process.exit(1);
});
//# sourceMappingURL=main.js.map