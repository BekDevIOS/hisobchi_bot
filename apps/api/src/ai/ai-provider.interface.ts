import { Currency } from '@prisma/client';

export interface AiTransactionContext { defaultCurrency: Currency; timezone: string; language: string; availableCategories: string[]; currentDate: string; }
export interface AiParsedTransaction { intent: 'CREATE_TRANSACTION'; type: 'INCOME' | 'EXPENSE'; amount: string; currency: Currency; category: string; description: string; transactionDate: string; confidence: number; }
export interface AiProvider { parseTransaction(text: string, context: AiTransactionContext): Promise<AiParsedTransaction>; }
