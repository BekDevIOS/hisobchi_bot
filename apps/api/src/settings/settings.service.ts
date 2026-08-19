import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';

const updateSchema = z.object({ defaultCurrency: z.nativeEnum(Currency).optional(), language: z.string().min(2).max(10).optional(), timezone: z.string().min(1).max(80).optional() }).strict();

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}
  get(userId: string) { return this.prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } }); }
  async update(userId: string, input: unknown) {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid settings');
    return this.prisma.userSettings.upsert({ where: { userId }, update: parsed.data, create: { userId, ...parsed.data } });
  }
}
