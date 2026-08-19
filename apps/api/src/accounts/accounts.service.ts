import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Account, AccountType, Currency, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';
import { decimalJson } from '../common/decimal';

const accountSchema = z.object({ name: z.string().trim().min(1).max(80), type: z.nativeEnum(AccountType).default(AccountType.CASH), currency: z.nativeEnum(Currency), initialBalance: z.union([z.string(), z.number()]).default('0') }).strict();

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string) { const rows = await this.prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }); return Promise.all(rows.map((a) => this.withBalance(a))); }
  async get(userId: string, id: string) { const account = await this.prisma.account.findFirst({ where: { id, userId } }); if (!account) throw new NotFoundException('Account not found'); return this.withBalance(account); }
  async create(userId: string, input: unknown) {
    const parsed = accountSchema.safeParse(input); if (!parsed.success) throw new BadRequestException('Invalid account');
    const initialBalance = this.money(parsed.data.initialBalance);
    return this.withBalance(await this.prisma.account.create({ data: { userId, name: parsed.data.name, type: parsed.data.type, currency: parsed.data.currency, initialBalance } }));
  }
  async update(userId: string, id: string, input: unknown) {
    const account = await this.prisma.account.findFirst({ where: { id, userId } }); if (!account) throw new NotFoundException('Account not found');
    const parsed = accountSchema.partial().safeParse(input); if (!parsed.success) throw new BadRequestException('Invalid account');
    if (parsed.data.currency && parsed.data.currency !== account.currency) { const count = await this.prisma.transaction.count({ where: { accountId: id } }); if (count) throw new ConflictException('Currency cannot change after transactions exist'); }
    const data: Prisma.AccountUpdateInput = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.currency !== undefined) data.currency = parsed.data.currency;
    if (parsed.data.initialBalance !== undefined) data.initialBalance = this.money(parsed.data.initialBalance);
    return this.withBalance(await this.prisma.account.update({ where: { id }, data }));
  }
  async disable(userId: string, id: string) { const result = await this.prisma.account.updateMany({ where: { id, userId }, data: { isActive: false } }); if (!result.count) throw new NotFoundException('Account not found'); return { success: true }; }
  private money(value: string | number) { const str = String(value); if (!/^\d+(\.\d{1,4})?$/.test(str)) throw new BadRequestException('Initial balance must be zero or greater'); const amount = new Prisma.Decimal(str); if (amount.isNegative()) throw new BadRequestException('Initial balance must be zero or greater'); return amount; }
  private async withBalance(account: Account) { const totals = await this.prisma.transaction.groupBy({ by: ['type'], where: { accountId: account.id, userId: account.userId }, _sum: { amount: true } }); let balance = new Prisma.Decimal(account.initialBalance); for (const total of totals) balance = total.type === 'INCOME' ? balance.add(total._sum.amount ?? 0) : total.type === 'EXPENSE' ? balance.sub(total._sum.amount ?? 0) : balance; return { ...account, initialBalance: decimalJson(account.initialBalance), balance: decimalJson(balance) }; }
}
