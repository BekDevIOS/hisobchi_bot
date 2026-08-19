import { Body, Controller, Headers, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly service: TelegramService) {}
  @Post('onboard') onboard(@Body() body: unknown, @Headers('x-telegram-bot-secret') secret?: string) { return this.service.onboard(body, secret); }
}
