"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailRfqModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const rfqs_module_1 = require("../rfqs/rfqs.module");
const email_rfq_controller_1 = require("./email-rfq.controller");
const email_rfq_service_1 = require("./email-rfq.service");
let EmailRfqModule = class EmailRfqModule {
};
exports.EmailRfqModule = EmailRfqModule;
exports.EmailRfqModule = EmailRfqModule = __decorate([
    (0, common_1.Module)({
        imports: [rfqs_module_1.RfqsModule],
        controllers: [email_rfq_controller_1.EmailRfqController],
        providers: [email_rfq_service_1.EmailRfqService, prisma_service_1.PrismaService],
        exports: [email_rfq_service_1.EmailRfqService],
    })
], EmailRfqModule);
//# sourceMappingURL=email-rfq.module.js.map