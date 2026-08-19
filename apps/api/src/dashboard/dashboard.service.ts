import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma.service';
import { decimalJson } from '../common/decimal';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async summary(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const zone = settings?.timezone ?? 'Asia/Seoul'; const now = DateTime.now().setZone(zone); const start = now.startOf('month').toJSDate(); const end = now.endOf('month').toJSDate();
    const [accounts, monthRows, categoryRows, recent] = await Promise.all([
      this.prisma.account.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.transaction.groupBy({ by: ['type', 'currency'], where: { userId, type: { in: ['INCOME', 'EXPENSE'] }, transactionDate: { gte: start, lte: end } }, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({ by: ['categoryId', 'currency'], where: { userId, type: 'EXPENSE', transactionDate: { gte: start, lte: end } }, _sum: { amount: true } }),
      this.prisma.transaction.findMany({ where: { userId }, include: { account: true, category: true }, orderBy: { transactionDate: 'desc' }, take: 8 }),
    ]);
    const balances: Record<string, Prisma.Decimal> = {};
    for (const account of accounts) {
      const totals = await this.prisma.transaction.groupBy({ by: ['type'], where: { userId, accountId: account.id }, _sum: { amount: true } });
      let balance = (balances[account.currency] ?? new Prisma.Decimal(0)).add(account.initialBalance);
      for (const total of totals) balance = total.type === 'INCOME' ? balance.add(total._sum.amount ?? 0) : total.type === 'EXPENSE' ? balance.sub(total._sum.amount ?? 0) : balance;
      balances[account.currency] = balance;
    }
    const monthly = { income: {} as Record<string, string>, expense: {} as Record<string, string> };
    for (const row of monthRows) { const target = row.type === 'INCOME' ? monthly.income : monthly.expense; target[row.currency] = decimalJson(row._sum.amount ?? 0); }
    const categoryIds = categoryRows.map((row) => row.categoryId); const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } }); const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return { balances: Object.fromEntries(Object.entries(balances).map(([currency, value]) => [currency, decimalJson(value)])), accounts: accounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency, type: account.type })), monthly, expenseByCategory: categoryRows.map((row) => ({ category: categoryMap.get(row.categoryId), currency: row.currency, amount: decimalJson(row._sum.amount ?? 0) })), recentTransactions: recent.map((row) => ({ ...row, amount: decimalJson(row.amount) })) };
  }
}
