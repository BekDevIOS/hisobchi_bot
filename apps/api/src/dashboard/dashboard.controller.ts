import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary') summary(@CurrentUser() u: AuthUser) { return this.service.summary(u.id); }
}
