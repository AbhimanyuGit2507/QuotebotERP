"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdooModule = void 0;
const common_1 = require("@nestjs/common");
const odoo_controller_1 = require("./odoo.controller");
const odoo_service_1 = require("./odoo.service");
const common_module_1 = require("../../common/common.module");
let OdooModule = class OdooModule {
};
exports.OdooModule = OdooModule;
exports.OdooModule = OdooModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule],
        controllers: [odoo_controller_1.OdooController],
        providers: [odoo_service_1.OdooService],
        exports: [odoo_service_1.OdooService],
    })
], OdooModule);
//# sourceMappingURL=odoo.module.js.map