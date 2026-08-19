import { CategoryType, Currency } from '@prisma/client';
import { DateTime } from 'luxon';
import { ParserService } from './parser.service';

describe('ParserService', () => {
  const parser = new ParserService(); const now = DateTime.fromISO('2026-08-19T10:00:00', { zone: 'Asia/Seoul' });
  it.each([
    ['-45000 tushlik', '45000', CategoryType.EXPENSE, Currency.UZS, 'FOOD', '2026-08-19'],
    ['+5000000 oylik', '5000000', CategoryType.INCOME, Currency.UZS, 'SALARY', '2026-08-19'],
    ['35 ming taxi', '35000', CategoryType.EXPENSE, Currency.UZS, 'TRANSPORT', '2026-08-19'],
    ['coffee 5500 won', '5500', CategoryType.EXPENSE, Currency.KRW, 'FOOD', '2026-08-19'],
    ['20 dollar subscription', '20', CategoryType.EXPENSE, Currency.USD, 'COMMUNICATION', '2026-08-19'],
    ['kecha 35 ming tushlik', '35000', CategoryType.EXPENSE, Currency.KRW, 'FOOD', '2026-08-18'],
  ])('%s parses', (text, amount, type, currency, categorySlug, date) => {
    const result = parser.parse(text, Currency.KRW, 'Asia/Seoul', now);
    expect(result.success).toBe(true); expect(result.amount).toBe(amount); expect(result.type).toBe(type); expect(result.currency).toBe(currency); expect(result.categorySlug).toBe(categorySlug); expect(result.transactionDate).toBe(date);
  });
  it('normalizes a negative raw amount without losing the expense meaning', () => expect(parser.parse('-45000 lunch', Currency.USD, 'Asia/Seoul', now).amount).toBe('45000'));
  it('returns an uncertain result when amount is absent', () => expect(parser.parse('lunch', Currency.UZS, 'Asia/Seoul', now).success).toBe(false));
});
