import { Injectable } from '@nestjs/common';
import { CategoryType, Currency, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { ParsedTransaction } from './parser.types';

type CategoryRule = { slug: string; keywords: string[] };

export const CATEGORY_RULES: Record<CategoryType, CategoryRule[]> = {
  EXPENSE: [
    { slug: 'FOOD', keywords: ['ovqat', 'tushlik', 'nonushta', 'kechki ovqat', 'food', 'lunch', 'dinner', 'coffee', 'kofe', 'cafe', 'restaurant'] },
    { slug: 'TRANSPORT', keywords: ['taxi', 'taksi', 'metro', 'bus', 'avtobus', 'transport', 'benzin', 'gas', 'fuel'] },
    { slug: 'SHOPPING', keywords: ['shopping', 'kiyim', 'market', "do'kon", 'dokon', 'store'] },
    { slug: 'HOME', keywords: ['home', 'uy', 'ijara', 'rent', 'electricity', 'kommunal'] },
    { slug: 'HEALTH', keywords: ['health', 'soglik', "sog'liq", 'doctor', 'dori', 'pharmacy'] },
    { slug: 'ENTERTAINMENT', keywords: ['kino', 'movie', 'entertainment', 'game', 'konsert'] },
    { slug: 'EDUCATION', keywords: ["education", "ta'lim", 'book', 'kurs'] },
    { slug: 'COMMUNICATION', keywords: ['internet', 'phone', 'aloqa', 'telefon', 'subscription'] },
    { slug: 'CREDIT', keywords: ['credit', 'kredit', 'loan'] },
  ],
  INCOME: [
    { slug: 'SALARY', keywords: ['oylik', 'salary', 'maosh', 'paycheck'] },
    { slug: 'FREELANCE', keywords: ['freelance', 'freelans'] },
    { slug: 'BUSINESS', keywords: ['biznes', 'business', 'sales', 'savdo'] },
    { slug: 'GIFT', keywords: ['sovga', "sovg'a", 'gift'] },
    { slug: 'INVESTMENT', keywords: ['investment', 'investitsiya', 'dividend'] },
  ],
};

@Injectable()
export class ParserService {
  parse(text: string, defaultCurrency: Currency, timezone: string, now = DateTime.now()): ParsedTransaction {
    const normalized = text.trim().toLocaleLowerCase();
    const amountMatch = normalized.match(/([+-]?\d+(?:[.,]\d+)?)(?:\s*)(ming|k|mln|million|m)?/i);
    if (!amountMatch) return { success: false, confidence: 0, type: CategoryType.EXPENSE, amount: '0', currency: defaultCurrency, categorySlug: null, description: text.trim(), transactionDate: now.setZone(timezone).toISODate() ?? '', explicitCurrency: false, reason: 'Amount not found' };
    const rawNumber = amountMatch[1]?.replace(',', '.') ?? '0';
    const suffix = amountMatch[2]?.toLowerCase();
    const multiplier = suffix === 'ming' || suffix === 'k' ? 1000 : suffix === 'mln' || suffix === 'million' || suffix === 'm' ? 1000000 : 1;
    const signedAmount = new Prisma.Decimal(rawNumber).mul(multiplier); const decimalAmount = signedAmount.abs(); const amount = decimalAmount.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    if (decimalAmount.isZero()) return { success: false, confidence: 0.2, type: CategoryType.EXPENSE, amount: '0', currency: defaultCurrency, categorySlug: null, description: text.trim(), transactionDate: now.setZone(timezone).toISODate() ?? '', explicitCurrency: false, reason: 'Amount must be greater than zero' };
    const explicitCurrency = this.currencyFrom(normalized);
    const hasIncomeKeyword = CATEGORY_RULES.INCOME.some((candidate) => candidate.keywords.some((keyword) => normalized.includes(keyword)));
    const type = normalized.trimStart().startsWith('+') || (!normalized.trimStart().startsWith('-') && hasIncomeKeyword) ? CategoryType.INCOME : CategoryType.EXPENSE;
    const categorySlug = this.categoryFrom(normalized, type);
    const localNow = now.setZone(timezone);
    const transactionDate = /(^|\s)(kecha|yesterday)(\s|$)/i.test(normalized) ? localNow.minus({ days: 1 }).toISODate()! : localNow.toISODate()!;
    const description = normalized.replace(/(^|\s)(kecha|yesterday|bugun|today)(?=\s|$)/gi, ' ').replace(amountMatch[0], ' ').replace(/\b(som|so'm|sum|uzs|won|krw|dollar|usd)\b|\$|\u20a9/gi, ' ').replace(/\s+/g, ' ').trim();
    const confidence = Math.min(0.99, 0.48 + (normalized.trimStart().match(/^[+-]/) ? 0.18 : 0) + (explicitCurrency ? 0.15 : 0.1) + (categorySlug ? 0.18 : 0.04));
    return { success: true, confidence, type, amount, currency: explicitCurrency ?? defaultCurrency, categorySlug, description: description || (categorySlug ?? 'Transaction'), transactionDate, explicitCurrency: Boolean(explicitCurrency) };
  }

  private currencyFrom(text: string): Currency | null {
    if (/\b(krw|won)\b|\u20a9/.test(text)) return Currency.KRW;
    if (/\b(usd|dollar)\b|\$/.test(text)) return Currency.USD;
    if (/\b(uzs|som|so'm|sum)\b/.test(text)) return Currency.UZS;
    return null;
  }

  private categoryFrom(text: string, type: CategoryType): string | null {
    const rule = CATEGORY_RULES[type].find((candidate) => candidate.keywords.some((keyword) => text.includes(keyword)));
    return rule?.slug ?? null;
  }
}
