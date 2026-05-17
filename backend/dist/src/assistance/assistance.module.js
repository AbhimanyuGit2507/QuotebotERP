"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistanceModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const assistance_controller_1 = require("./assistance.controller");
const assistance_service_1 = require("./assistance.service");
let AssistanceModule = class AssistanceModule {
};
exports.AssistanceModule = AssistanceModule;
exports.AssistanceModule = AssistanceModule = __decorate([
    (0, common_1.Module)({
        controllers: [assistance_controller_1.AssistanceController],
        providers: [assistance_service_1.AssistanceService, prisma_service_1.PrismaService],
        exports: [assistance_service_1.AssistanceService],
    })
], AssistanceModule);
//# sourceMappingURL=assistance.module.js.map