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
const quotations_module_1 = require("../quotations/quotations.module");
const email_module_1 = require("../email/email.module");
const email_templates_module_1 = require("../email-templates/email-templates.module");
const email_rfq_controller_1 = require("./email-rfq.controller");
const email_rfq_service_1 = require("./email-rfq.service");
const thread_resolver_service_1 = require("./thread-resolver.service");
const po_matcher_service_1 = require("./po-matcher.service");
let EmailRfqModule = class EmailRfqModule {
};
exports.EmailRfqModule = EmailRfqModule;
exports.EmailRfqModule = EmailRfqModule = __decorate([
    (0, common_1.Module)({
        imports: [rfqs_module_1.RfqsModule, quotations_module_1.QuotationsModule, email_module_1.EmailModule, email_templates_module_1.EmailTemplatesModule],
        controllers: [email_rfq_controller_1.EmailRfqController],
        providers: [
            email_rfq_service_1.EmailRfqService,
            prisma_service_1.PrismaService,
            thread_resolver_service_1.ThreadResolverService,
            po_matcher_service_1.PoMatcherService,
        ],
        exports: [email_rfq_service_1.EmailRfqService, thread_resolver_service_1.ThreadResolverService, po_matcher_service_1.PoMatcherService],
    })
], EmailRfqModule);
//# sourceMappingURL=email-rfq.module.js.map