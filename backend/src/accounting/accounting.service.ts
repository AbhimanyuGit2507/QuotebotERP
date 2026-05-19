import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { CreateJournalEntryDto } from './dtos/create-journal-entry.dto';

interface DefaultAccount {
  code: string;
  name: string;
  type: string;
  description?: string;
}

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // ASSET accounts (1000-1999)
  { code: '1000', name: 'Cash', type: 'ASSET', description: 'Cash and bank balances' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Trade receivables from customers' },
  { code: '1200', name: 'Inventory', type: 'ASSET', description: 'Stock of goods' },
  // LIABILITY accounts (2000-2999)
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Trade payables to suppliers' },
  { code: '2100', name: 'GST Payable', type: 'LIABILITY', description: 'GST liability' },
  // EQUITY accounts (3000-3999)
  { code: '3000', name: "Owner's Equity", type: 'EQUITY', description: 'Capital contributed by owners' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits' },
  // REVENUE accounts (4000-4999)
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Revenue from product sales' },
  { code: '4100', name: 'Service Revenue', type: 'REVENUE', description: 'Revenue from services' },
  // EXPENSE accounts (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct cost of goods sold' },
  { code: '5100', name: 'Operating Expenses', type: 'EXPENSE', description: 'General operating expenses' },
  { code: '5200', name: 'Salaries', type: 'EXPENSE', description: 'Employee salaries and wages' },
];

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /* ─── Chart of Accounts ─── */

  async seedDefaultAccounts(tenantId: string) {
    const created: any[] = [];
    for (const acct of DEFAULT_ACCOUNTS) {
      const existing = await this.prisma.chartOfAccount.findUnique({
        where: { tenant_id_code: { tenant_id: tenantId, code: acct.code } },
      });
      if (!existing) {
        const record = await this.prisma.chartOfAccount.create({
          data: {
            tenant_id: tenantId,
            code: acct.code,
            name: acct.name,
            type: acct.type,
            description: acct.description,
            is_system: true,
          },
        });
        created.push(record);
      }
    }
    return { seeded: created.length, accounts: created };
  }

  async getChartOfAccounts(tenantId: string) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: { children: { where: { deleted_at: null } } },
      orderBy: { code: 'asc' },
    });

    // Build a hierarchy: only return root-level accounts (no parent) as top-level,
    // children are included via the relation
    const roots = accounts.filter((a) => !a.parent_id);
    return roots;
  }

  async getAllAccounts(tenantId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(tenantId: string, dto: CreateAccountDto) {
    if (dto.parentId) {
      const parent = await this.prisma.chartOfAccount.findFirst({
        where: { id: dto.parentId, tenant_id: tenantId, deleted_at: null },
      });
      if (!parent) throw new NotFoundException('Parent account not found');
    }

    return this.prisma.chartOfAccount.create({
      data: {
        tenant_id: tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parent_id: dto.parentId || null,
        description: dto.description,
        is_system: false,
      },
    });
  }

  async updateAccount(tenantId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!account) throw new NotFoundException('Account not found');

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async deleteAccount(tenantId: string, id: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!account) throw new NotFoundException('Account not found');

    if (account.is_system) {
      throw new BadRequestException('Cannot delete system accounts');
    }

    // Check for existing journal entries referencing this account
    const journalCount = await this.prisma.journalEntry.count({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        OR: [{ debit_account_id: id }, { credit_account_id: id }],
      },
    });
    if (journalCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing journal entries',
      );
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  /* ─── Journal Entries ─── */

  private async generateEntryNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `JE-${yyyy}${mm}-`;

    const latest = await this.prisma.journalEntry.findFirst({
      where: {
        tenant_id: tenantId,
        entry_number: { startsWith: prefix },
      },
      orderBy: { entry_number: 'desc' },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.entry_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  async createJournalEntry(tenantId: string, dto: CreateJournalEntryDto, userId?: string) {
    // Validate debit and credit accounts exist
    const [debitAcct, creditAcct] = await Promise.all([
      this.prisma.chartOfAccount.findFirst({
        where: { id: dto.debitAccountId, tenant_id: tenantId, deleted_at: null },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: { id: dto.creditAccountId, tenant_id: tenantId, deleted_at: null },
      }),
    ]);

    if (!debitAcct) throw new NotFoundException('Debit account not found');
    if (!creditAcct) throw new NotFoundException('Credit account not found');

    // Wrap number generation + create in transaction to avoid race conditions
    return this.prisma.$transaction(async (tx) => {
      const entryNumber = await this.generateEntryNumberTx(tx, tenantId);

      return tx.journalEntry.create({
        data: {
          tenant_id: tenantId,
          entry_number: entryNumber,
          date: new Date(dto.date),
          description: dto.description,
          debit_account_id: dto.debitAccountId,
          credit_account_id: dto.creditAccountId,
          amount: dto.amount,
          reference_type: dto.referenceType || 'MANUAL',
          reference_id: dto.referenceId,
          is_auto: false,
          created_by: userId,
        },
        include: { debit_account: true, credit_account: true },
      });
    });
  }

  private async generateEntryNumberTx(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `JE-${yyyy}${mm}-`;

    const latest = await tx.journalEntry.findFirst({
      where: {
        tenant_id: tenantId,
        entry_number: { startsWith: prefix },
      },
      orderBy: { entry_number: 'desc' },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.entry_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  async createAutoJournalEntry(
    tenantId: string,
    data: {
      type: 'INVOICE' | 'PAYMENT';
      invoiceId: string;
      amount: number;
    },
  ) {
    try {
      // Auto-seed chart of accounts if none exist for this tenant
      const accountCount = await this.prisma.chartOfAccount.count({
        where: { tenant_id: tenantId, deleted_at: null },
      });
      if (accountCount === 0) {
        this.logger.log(`Auto-seeding default accounts for tenant ${tenantId}`);
        await this.seedDefaultAccounts(tenantId);
      }

      // Find the relevant accounts
      const accountsNeeded =
        data.type === 'INVOICE'
          ? { debitCode: '1100', creditCode: '4000' } // AR debit, Sales Revenue credit
          : { debitCode: '1000', creditCode: '1100' }; // Cash debit, AR credit

      const [debitAcct, creditAcct] = await Promise.all([
        this.prisma.chartOfAccount.findFirst({
          where: {
            tenant_id: tenantId,
            code: accountsNeeded.debitCode,
            deleted_at: null,
          },
        }),
        this.prisma.chartOfAccount.findFirst({
          where: {
            tenant_id: tenantId,
            code: accountsNeeded.creditCode,
            deleted_at: null,
          },
        }),
      ]);

      if (!debitAcct || !creditAcct) {
        this.logger.warn(
          `Auto journal entry skipped: missing accounts for tenant ${tenantId}`,
        );
        return null;
      }

      const entryNumber = await this.generateEntryNumber(tenantId);
      const description =
        data.type === 'INVOICE'
          ? `Invoice created — ${data.invoiceId}`
          : `Payment received — ${data.invoiceId}`;

      return this.prisma.journalEntry.create({
        data: {
          tenant_id: tenantId,
          entry_number: entryNumber,
          date: new Date(),
          description,
          debit_account_id: debitAcct.id,
          credit_account_id: creditAcct.id,
          amount: data.amount,
          reference_type: data.type,
          reference_id: data.invoiceId,
          is_auto: true,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to create auto journal entry: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async getJournalEntries(
    tenantId: string,
    filters: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      accountId?: string;
    },
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
    };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.accountId) {
      where.OR = [
        { debit_account_id: filters.accountId },
        { credit_account_id: filters.accountId },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { debit_account: true, credit_account: true },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /* ─── Reports ─── */

  async getTrialBalance(tenantId: string, asOfDate?: string) {
    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { code: 'asc' },
    });

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        date: { lte: dateFilter },
      },
    });

    // Build debit/credit totals per account
    const debitTotals: Record<string, number> = {};
    const creditTotals: Record<string, number> = {};

    for (const entry of entries) {
      const amount = Number(entry.amount);
      debitTotals[entry.debit_account_id] =
        (debitTotals[entry.debit_account_id] || 0) + amount;
      creditTotals[entry.credit_account_id] =
        (creditTotals[entry.credit_account_id] || 0) + amount;
    }

    let totalDebits = 0;
    let totalCredits = 0;

    const accountRows = accounts
      .map((acct) => {
        const debitBalance = Math.round((debitTotals[acct.id] || 0) * 100) / 100;
        const creditBalance = Math.round((creditTotals[acct.id] || 0) * 100) / 100;
        totalDebits += debitBalance;
        totalCredits += creditBalance;
        return {
          code: acct.code,
          name: acct.name,
          type: acct.type,
          debitBalance,
          creditBalance,
        };
      })
      .filter((r) => r.debitBalance > 0 || r.creditBalance > 0);

    return {
      accounts: accountRows,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
    };
  }

  async getProfitAndLoss(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1); // Jan 1 of current year
    const end = endDate ? new Date(endDate) : new Date();

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        type: { in: ['REVENUE', 'EXPENSE'] },
      },
      orderBy: { code: 'asc' },
    });

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        date: { gte: start, lte: end },
      },
    });

    // Revenue: credit amounts to revenue accounts
    // Expenses: debit amounts to expense accounts
    const creditTotals: Record<string, number> = {};
    const debitTotals: Record<string, number> = {};

    for (const entry of entries) {
      const amount = Number(entry.amount);
      creditTotals[entry.credit_account_id] =
        (creditTotals[entry.credit_account_id] || 0) + amount;
      debitTotals[entry.debit_account_id] =
        (debitTotals[entry.debit_account_id] || 0) + amount;
    }

    const revenueAccounts = accounts.filter((a) => a.type === 'REVENUE');
    const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE');

    const revenue = revenueAccounts
      .map((a) => ({
        name: a.name,
        code: a.code,
        amount: Math.round((creditTotals[a.id] || 0) * 100) / 100,
      }))
      .filter((r) => r.amount > 0);

    const expenses = expenseAccounts
      .map((a) => ({
        name: a.name,
        code: a.code,
        amount: Math.round((debitTotals[a.id] || 0) * 100) / 100,
      }))
      .filter((r) => r.amount > 0);

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

    return {
      revenue,
      expenses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round((totalRevenue - totalExpenses) * 100) / 100,
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate?: string) {
    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
      },
      orderBy: { code: 'asc' },
    });

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        date: { lte: dateFilter },
      },
    });

    const debitTotals: Record<string, number> = {};
    const creditTotals: Record<string, number> = {};

    for (const entry of entries) {
      const amount = Number(entry.amount);
      debitTotals[entry.debit_account_id] =
        (debitTotals[entry.debit_account_id] || 0) + amount;
      creditTotals[entry.credit_account_id] =
        (creditTotals[entry.credit_account_id] || 0) + amount;
    }

    const buildSection = (type: string) =>
      accounts
        .filter((a) => a.type === type)
        .map((a) => {
          const debits = debitTotals[a.id] || 0;
          const credits = creditTotals[a.id] || 0;
          // Assets have normal debit balance, Liabilities/Equity have normal credit balance
          const balance =
            type === 'ASSET' ? debits - credits : credits - debits;
          return {
            name: a.name,
            code: a.code,
            amount: Math.round(balance * 100) / 100,
          };
        })
        .filter((r) => r.amount !== 0);

    const assets = buildSection('ASSET');
    const liabilities = buildSection('LIABILITY');
    const equity = buildSection('EQUITY');

    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
    };
  }
}
