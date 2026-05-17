import { Injectable, Logger } from '@nestjs/common';
import https from 'https';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  // Uses exchangerate.host (no API key required) to fetch latest rates
  async getRate(base: string, target: string): Promise<number> {
    base = (base || 'INR').toUpperCase();
    target = (target || 'USD').toUpperCase();
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(
      base,
    )}&symbols=${encodeURIComponent(target)}`;

    return new Promise<number>((resolve, reject) => {
      https
        .get(url, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const parsed = JSON.parse(body) as Record<string, unknown>;
              const rates = parsed.rates;
              const rate =
                rates && typeof rates === 'object'
                  ? (rates as Record<string, unknown>)[target]
                  : undefined;
              if (!rate) {
                this.logger.warn('No rate returned from exchangerate.host');
                return reject(new Error('Rate not available'));
              }
              resolve(Number(rate));
            } catch (err) {
              this.logger.warn(
                'Failed parsing FX response',
                (err as Error).message,
              );
              reject(new Error(String(err)));
            }
          });
        })
        .on('error', (err) => reject(new Error(String(err))));
    });
  }
}

export default CurrencyService;
