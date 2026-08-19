import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma.service';

interface TelegramUser { id: number; first_name: string; last_name?: string; username?: string; }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async authenticateTelegram(initData: string) {
    const data = this.validateInitData(initData);
    let tgUser: TelegramUser;
    try { tgUser = JSON.parse(data.get('user') ?? '') as TelegramUser; } catch { throw new BadRequestException('Invalid Telegram user data'); }
    if (!tgUser?.id || !tgUser.first_name) throw new BadRequestException('Telegram user is missing');
    const user = await this.prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: { username: tgUser.username, firstName: tgUser.first_name, lastName: tgUser.last_name },
      create: {
        telegramId: String(tgUser.id), firstName: tgUser.first_name, lastName: tgUser.last_name, username: tgUser.username,
        settings: { create: {} },
      },
      include: { settings: true, accounts: true },
    });
    const token = await this.jwt.signAsync({ sub: user.id, telegramId: user.telegramId });
    return { accessToken: token, user: this.safeUser(user), needsOnboarding: user.accounts.length === 0 };
  }

  async authenticateTelegramUser(user: TelegramUser) {
    if (!user?.id || !user.first_name) throw new BadRequestException('Telegram user is missing');
    const stored = await this.prisma.user.upsert({
      where: { telegramId: String(user.id) },
      update: { username: user.username, firstName: user.first_name, lastName: user.last_name },
      create: { telegramId: String(user.id), firstName: user.first_name, lastName: user.last_name, username: user.username, settings: { create: {} } },
    });
    return stored;
  }

  private validateInitData(initData: string): URLSearchParams {
    if (!initData || initData.length > 4096) throw new BadRequestException('Invalid Telegram init data');
    const data = new URLSearchParams(initData);
    const hash = data.get('hash');
    const authDate = Number(data.get('auth_date'));
    if (!hash || !authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) throw new UnauthorizedException('Telegram init data expired');
    const checkString = [...data.entries()].filter(([key]) => key !== 'hash').sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    const calculated = createHmac('sha256', secret).update(checkString).digest('hex');
    if (calculated.length !== hash.length || !createHmac('sha256', calculated).digest().equals(createHmac('sha256', hash).digest())) throw new UnauthorizedException('Invalid Telegram signature');
    return data;
  }

  safeUser(user: { id: string; telegramId: string; firstName: string; lastName: string | null; username: string | null; settings?: unknown }) {
    return { id: user.id, telegramId: user.telegramId, firstName: user.firstName, lastName: user.lastName, username: user.username, settings: user.settings };
  }
}
