import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.service.get(user.id); }
  @Patch() update(@CurrentUser() user: AuthUser, @Body() body: unknown) { return this.service.update(user.id, body); }
}
