import { Decimal } from '@prisma/client/runtime/library';

export function decimalString(value: Decimal | number | string): string { return new Decimal(value).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); }
export function decimalJson(value: Decimal | number | string): string { return decimalString(value); }
