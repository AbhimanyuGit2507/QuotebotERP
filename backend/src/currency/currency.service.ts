import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import https from 'https';
import { PrismaService } from '../prisma.service';

const Decimal = Prisma.Decimal;

const SUPPORTED_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  async getExchangeRates(tenantId: string) {
    return this.prisma.exchangeRate.findMany({
      where: { tenant_id: tenantId },
      orderBy: { effective_date: 'desc' },
    });
  }

  async setExchangeRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ) {
    const existing = await this.prisma.exchangeRate.findFirst({
      where: {
        tenant_id: tenantId,
        from_currency: fromCurrency.toUpperCase(),
        to_currency: toCurrency.toUpperCase(),
      },
      orderBy: { effective_date: 'desc' },
    });

    if (existing) {
      return this.prisma.exchangeRate.update({
        where: { id: existing.id },
        data: {
          rate: new Decimal(rate),
          effective_date: new Date(),
        },
      });
    }

    return this.prisma.exchangeRate.create({
      data: {
        tenant_id: tenantId,
        from_currency: fromCurrency.toUpperCase(),
        to_currency: toCurrency.toUpperCase(),
        rate: new Decimal(rate),
      },
    });
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    tenantId: string,
  ) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { amount, from, to, rate: 1, result: amount };
    }

    const storedRate = await this.prisma.exchangeRate.findFirst({
      where: {
        tenant_id: tenantId,
        from_currency: from,
        to_currency: to,
      },
      orderBy: { effective_date: 'desc' },
    });

    if (storedRate) {
      const rate = Number(storedRate.rate);
      return {
        amount,
        from,
        to,
        rate,
        result: amount * rate,
        effective_date: storedRate.effective_date,
      };
    }

    const reverseRate = await this.prisma.exchangeRate.findFirst({
      where: {
        tenant_id: tenantId,
        from_currency: to,
        to_currency: from,
      },
      orderBy: { effective_date: 'desc' },
    });

    if (reverseRate) {
      const rate = 1 / Number(reverseRate.rate);
      return {
        amount,
        from,
        to,
        rate,
        result: amount * rate,
        effective_date: reverseRate.effective_date,
      };
    }

    throw new NotFoundException(
      `No exchange rate found for ${from} -> ${to}. Please set a rate first.`,
    );
  }
}

export default CurrencyService;
