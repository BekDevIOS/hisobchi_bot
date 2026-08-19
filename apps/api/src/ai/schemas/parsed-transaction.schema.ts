import { Currency } from '@prisma/client';
import { z } from 'zod';

export const parsedTransactionSchema = z.object({ intent: z.literal('CREATE_TRANSACTION'), type: z.enum(['INCOME', 'EXPENSE']), amount: z.string().regex(/^\d+(\.\d{1,4})?$/), currency: z.nativeEnum(Currency), category: z.string().min(1), description: z.string().min(1).max(300), transactionDate: z.string(), confidence: z.number().min(0).max(1) });
