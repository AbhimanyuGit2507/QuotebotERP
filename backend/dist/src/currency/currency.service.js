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
var CurrencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyService = void 0;
const common_1 = require("@nestjs/common");
const https_1 = __importDefault(require("https"));
let CurrencyService = CurrencyService_1 = class CurrencyService {
    logger = new common_1.Logger(CurrencyService_1.name);
    async getRate(base, target) {
        base = (base || 'INR').toUpperCase();
        target = (target || 'USD').toUpperCase();
        const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
        return new Promise((resolve, reject) => {
            https_1.default
                .get(url, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    try {
                        const body = Buffer.concat(chunks).toString('utf8');
                        const parsed = JSON.parse(body);
                        const rates = parsed.rates;
                        const rate = rates && typeof rates === 'object'
                            ? rates[target]
                            : undefined;
                        if (!rate) {
                            this.logger.warn('No rate returned from exchangerate.host');
                            return reject(new Error('Rate not available'));
                        }
                        resolve(Number(rate));
                    }
                    catch (err) {
                        this.logger.warn('Failed parsing FX response', err.message);
                        reject(new Error(String(err)));
                    }
                });
            })
                .on('error', (err) => reject(new Error(String(err))));
        });
    }
};
exports.CurrencyService = CurrencyService;
exports.CurrencyService = CurrencyService = CurrencyService_1 = __decorate([
    (0, common_1.Injectable)()
], CurrencyService);
exports.default = CurrencyService;
//# sourceMappingURL=currency.service.js.map