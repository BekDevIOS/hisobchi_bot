import { CategoryType, Currency } from '@prisma/client';

export interface ParsedTransaction {
  success: boolean;
  confidence: number;
  type: CategoryType;
  amount: string;
  currency: Currency;
  categorySlug: string | null;
  description: string;
  transactionDate: string;
  explicitCurrency: boolean;
  reason?: string;
}
