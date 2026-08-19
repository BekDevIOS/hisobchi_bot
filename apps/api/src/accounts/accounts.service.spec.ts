import { AccountType, Currency } from '@prisma/client';
import { AccountsService } from './accounts.service';

describe('AccountsService balance derivation', () => {
  it('keeps balances grouped by each account and currency', async () => {
    const accounts = [
      { id: 'a', userId: 'u', name: 'UZS Cash', type: AccountType.CASH, currency: Currency.UZS, initialBalance: '5000000', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'b', userId: 'u', name: 'KRW Card', type: AccountType.CARD, currency: Currency.KRW, initialBalance: '1000000', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    const prisma = { account: { findMany: jest.fn().mockResolvedValue(accounts) }, transaction: { groupBy: jest.fn().mockImplementation(({ where }: { where: { accountId: string } }) => Promise.resolve(where.accountId === 'a' ? [{ type: 'EXPENSE', _sum: { amount: '45000' } }] : [{ type: 'INCOME', _sum: { amount: '200000' } }])) } } as never;
    const result = await new AccountsService(prisma).list('u');
    expect(result.map((account) => [account.currency, account.balance])).toEqual([['UZS', '4955000'], ['KRW', '1200000']]);
  });
});
