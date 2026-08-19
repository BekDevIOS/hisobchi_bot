import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';

const telegramAuthSchema = z.object({ initData: z.string().min(1).max(4096) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('telegram')
  authenticate(@Body() body: unknown) {
    const parsed = telegramAuthSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('initData is required');
    return this.auth.authenticateTelegram(parsed.data.initData);
  }
}
