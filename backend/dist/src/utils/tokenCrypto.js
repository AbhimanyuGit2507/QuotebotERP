"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const crypto_1 = __importDefault(require("crypto"));
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('tokenCrypto');
const KEY = process.env.TOKEN_ENCRYPTION_KEY || '';
function keyBuffer() {
    if (!KEY)
        return null;
    if (KEY.length === 64 && /^[0-9a-fA-F]+$/.test(KEY))
        return Buffer.from(KEY, 'hex');
    return Buffer.from(KEY.padEnd(32).slice(0, 32));
}
function encryptToken(plaintext) {
    if (!plaintext)
        return plaintext;
    const k = keyBuffer();
    if (!k) {
        logger.warn('TOKEN_ENCRYPTION_KEY not set — storing tokens plaintext');
        return plaintext;
    }
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', k, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}
function decryptToken(encrypted) {
    if (!encrypted)
        return encrypted;
    const k = keyBuffer();
    if (!k) {
        logger.warn('TOKEN_ENCRYPTION_KEY not set — reading tokens plaintext');
        return encrypted;
    }
    try {
        const buf = Buffer.from(encrypted, 'base64');
        const iv = buf.slice(0, 12);
        const tag = buf.slice(12, 28);
        const data = buf.slice(28);
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', k, iv);
        decipher.setAuthTag(tag);
        const dec = Buffer.concat([decipher.update(data), decipher.final()]);
        return dec.toString('utf8');
    }
    catch (err) {
        logger.error('Failed to decrypt token', err);
        return encrypted;
    }
}
//# sourceMappingURL=tokenCrypto.js.map