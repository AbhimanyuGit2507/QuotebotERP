import crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('tokenCrypto');

const KEY = process.env.TOKEN_ENCRYPTION_KEY || '';

function keyBuffer() {
  if (!KEY) return null;
  // allow raw string or hex
  if (KEY.length === 64 && /^[0-9a-fA-F]+$/.test(KEY))
    return Buffer.from(KEY, 'hex');
  return Buffer.from(KEY.padEnd(32).slice(0, 32));
}

export function encryptToken(plaintext: string | undefined | null) {
  if (!plaintext) return plaintext;
  const k = keyBuffer();
  if (!k) {
    logger.warn('TOKEN_ENCRYPTION_KEY not set — storing tokens plaintext');
    return plaintext;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(encrypted: string | undefined | null) {
  if (!encrypted) return encrypted;
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
    const decipher = crypto.createDecipheriv('aes-256-gcm', k, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (err) {
    logger.error('Failed to decrypt token', err);
    return encrypted;
  }
}
