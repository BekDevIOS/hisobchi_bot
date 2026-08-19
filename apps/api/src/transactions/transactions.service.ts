import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType, Currency, Prisma, TransactionSource, TransactionType } from '@prisma/client';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';
import { decimalJson } from '../common/decimal';
import { CategoriesService } from '../categories/categories.service';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';

const createSchema = z.object({ type: z.enum(['INCOME', 'EXPENSE']), amount: z.union([z.string(), z.number()]), accountId: z.string().uuid(), categoryId: z.string().uuid(), description: z.string().trim().min(1).max(300), transactionDate: z.string().optional(), source: z.enum(['BOT', 'WEB', 'AI', 'SYSTEM']).optional() }).strict();
const filtersSchema = z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional(), type: z.enum(['INCOME', 'EXPENSE']).optional(), accountId: z.string().uuid().optional(), categoryId: z.string().uuid().optional(), currency: z.nativeEnum(Currency).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService, private readonly categories: CategoriesService, private readonly parser: ParserService, private readonly ai: AiService) {}

  async list(userId: string, input: Record<string, unknown>) {
    const parsedFilters = filtersSchema.safeParse(input); if (!parsedFilters.success) throw new BadRequestException('Invalid transaction filters'); const filters = parsedFilters.data;
    const from = filters.dateFrom ? DateTime.fromISO(filters.dateFrom) : null; const to = filters.dateTo ? DateTime.fromISO(filters.dateTo) : null; if (from && !from.isValid || to && !to.isValid) throw new BadRequestException('Invalid transaction date filter');
    const where: Prisma.TransactionWhereInput = { userId, ...(filters.type ? { type: filters.type as TransactionType } : {}), ...(filters.accountId ? { accountId: filters.accountId } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(from || to ? { transactionDate: { ...(from ? { gte: from.startOf('day').toJSDate() } : {}), ...(to ? { lte: to.endOf('day').toJSDate() } : {}) } } : {}) };
    const [rows, total] = await Promise.all([this.prisma.transaction.findMany({ where, include: { account: true, category: true }, orderBy: { transactionDate: 'desc' }, skip: (filters.page - 1) * filters.limit, take: filters.limit }), this.prisma.transaction.count({ where })]);
    return { data: rows.map((row) => ({ ...row, amount: decimalJson(row.amount) })), pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async get(userId: string, id: string) { const row = await this.prisma.transaction.findFirst({ where: { id, userId }, include: { account: true, category: true } }); if (!row) throw new NotFoundException('Transaction not found'); return { ...row, amount: decimalJson(row.amount) }; }

  async create(userId: string, input: unknown) {
    const parsed = createSchema.safeParse(input); if (!parsed.success) throw new BadRequestException('Invalid transaction');
    const amount = this.money(parsed.data.amount);
    const account = await this.prisma.account.findFirst({ where: { id: parsed.data.accountId, userId, isActive: true } }); if (!account) throw new BadRequestException('Account does not belong to the user or is inactive');
    const category = await this.prisma.category.findFirst({ where: { id: parsed.data.categoryId, type: parsed.data.type as CategoryType, OR: [{ isSystem: true, userId: null }, { userId }] } }); if (!category) throw new BadRequestException('Category does not match transaction type');
    const currency = account.currency;
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } }); const date = parsed.data.transactionDate ? DateTime.fromISO(parsed.data.transactionDate, { zone: settings?.timezone ?? 'Asia/Seoul' }).startOf('day').toUTC().toJSDate() : new Date(); if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid transaction date');
    const created = await this.prisma.transaction.create({ data: { userId, accountId: account.id, categoryId: category.id, type: parsed.data.type as TransactionType, amount, currency, description: parsed.data.description, transactionDate: date, source: (parsed.data.source as TransactionSource | undefined) ?? TransactionSource.WEB }, include: { account: true, category: true } });
    return { ...created, amount: decimalJson(created.amount) };
  }

  async update(userId: string, id: string, input: unknown) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } }); if (!existing) throw new NotFoundException('Transaction not found');
    const parsed = createSchema.partial().safeParse(input); if (!parsed.success) throw new BadRequestException('Invalid transaction');
    const type = (parsed.data.type ?? existing.type) as TransactionType; const accountId = parsed.data.accountId ?? existing.accountId; const categoryId = parsed.data.categoryId ?? existing.categoryId; const account = await this.prisma.account.findFirst({ where: { id: accountId, userId, isActive: true } }); if (!account) throw new BadRequestException('Account does not belong to the user or is inactive'); const category = await this.prisma.category.findFirst({ where: { id: categoryId, type: type as CategoryType, OR: [{ isSystem: true, userId: null }, { userId }] } }); if (!category) throw new BadRequestException('Category does not match transaction type'); const amount = parsed.data.amount === undefined ? existing.amount : this.money(parsed.data.amount); const settings = await this.prisma.userSettings.findUnique({ where: { userId } }); const date = parsed.data.transactionDate ? DateTime.fromISO(parsed.data.transactionDate, { zone: settings?.timezone ?? 'Asia/Seoul' }).startOf('day').toUTC().toJSDate() : existing.transactionDate; if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid transaction date');
    const updated = await this.prisma.transaction.update({ where: { id }, data: { type, accountId, categoryId, amount, currency: account.currency, description: parsed.data.description ?? existing.description, transactionDate: date, source: (parsed.data.source as TransactionSource | undefined) ?? existing.source }, include: { account: true, category: true } });
    return { ...updated, amount: decimalJson(updated.amount) };
  }
  async remove(userId: string, id: string) { const result = await this.prisma.transaction.deleteMany({ where: { id, userId } }); if (!result.count) throw new NotFoundException('Transaction not found'); return { success: true }; }

  async parseAndMaybeCreate(userId: string, text: string, commit: boolean, source: TransactionSource = TransactionSource.BOT) {
    const [settings, firstAccount] = await Promise.all([this.prisma.userSettings.findUnique({ where: { userId } }), this.prisma.account.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: 'asc' } })]);
    let result = this.parser.parse(text, settings?.defaultCurrency ?? Currency.UZS, settings?.timezone ?? 'Asia/Seoul');
    if ((!result.success || result.confidence < 0.75) && this.ai.isEnabled()) {
      try { const available = await this.categories.list(userId); const aiResult = await this.ai.parse(text, { defaultCurrency: settings?.defaultCurrency ?? Currency.UZS, timezone: settings?.timezone ?? 'Asia/Seoul', language: settings?.language ?? 'uz', availableCategories: available.map((category) => category.slug), currentDate: DateTime.now().setZone(settings?.timezone ?? 'Asia/Seoul').toISODate()! }); result = { success: true, confidence: aiResult.confidence, type: aiResult.type as CategoryType, amount: aiResult.amount, currency: aiResult.currency, categorySlug: aiResult.category.toUpperCase(), description: aiResult.description, transactionDate: aiResult.transactionDate, explicitCurrency: true }; } catch { /* An AI failure must result in confirmation, never a database write. */ }
    }
    if (!result.success || result.confidence < 0.75) return { parsed: result, created: null, requiresConfirmation: true };
    const account = firstAccount && firstAccount.currency === result.currency ? firstAccount : await this.prisma.account.findFirst({ where: { userId, currency: result.currency, isActive: true }, orderBy: { createdAt: 'asc' } });
    const category = result.categorySlug ? await this.categories.findForUser(userId, result.categorySlug, result.type) : null;
    if (!account || !category) return { parsed: result, created: null, requiresConfirmation: true, reason: !account ? 'No account with matching currency' : 'Category was not found' };
    if (!commit) return { parsed: result, created: null, requiresConfirmation: false };
    const created = await this.create(userId, { type: result.type, amount: result.amount, accountId: account.id, categoryId: category.id, description: result.description, transactionDate: result.transactionDate, source });
    return { parsed: result, created: { ...created, amount: decimalJson(created.amount) }, requiresConfirmation: false };
  }

  private money(value: string | number) { const str = String(value); if (!/^\d+(\.\d{1,4})?$/.test(str)) throw new BadRequestException('Transaction amount must be greater than zero'); const amount = new Prisma.Decimal(str); if (amount.isZero() || amount.isNegative()) throw new BadRequestException('Transaction amount must be greater than zero'); return amount; }
}
