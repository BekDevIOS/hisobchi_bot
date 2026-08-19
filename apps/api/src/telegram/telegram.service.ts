import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AccountType, Currency } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.service';

const userSchema = z.object({ id: z.number().int().positive(), first_name: z.string().min(1).max(100), last_name: z.string().max(100).optional(), username: z.string().max(100).optional() });
const onboardSchema = z.object({ user: userSchema, currency: z.nativeEnum(Currency).optional() });

@Injectable()
export class TelegramService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly jwt: JwtService, private readonly config: ConfigService) {}
  async onboard(input: unknown, secret: string | undefined) {
    this.checkSecret(secret); const parsed = onboardSchema.safeParse(input); if (!parsed.success) throw new BadRequestException('Invalid Telegram user');
    const user = await this.auth.authenticateTelegramUser(parsed.data.user);
    const { settings, accountCount } = await this.prisma.$transaction(async (tx) => {
      const settings = await tx.userSettings.upsert({ where: { userId: user.id }, update: parsed.data.currency ? { defaultCurrency: parsed.data.currency } : {}, create: { userId: user.id, defaultCurrency: parsed.data.currency ?? Currency.UZS } });
      const accountCount = await tx.account.count({ where: { userId: user.id } });
      if (!accountCount && parsed.data.currency) await tx.account.create({ data: { userId: user.id, name: 'Main Account', type: AccountType.CASH, currency: settings.defaultCurrency, initialBalance: 0 } });
      return { settings, accountCount };
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id, telegramId: user.telegramId });
    return { accessToken, user: this.auth.safeUser({ ...user, settings }), needsCurrency: !parsed.data.currency && accountCount === 0 };
  }
  private checkSecret(secret: string | undefined) { const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET'); if (!expected || secret !== expected) throw new ForbiddenException('Invalid bot secret'); }
}
