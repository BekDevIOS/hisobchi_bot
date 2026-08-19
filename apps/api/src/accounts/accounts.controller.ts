import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly service: AccountsService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.service.list(u.id); }
  @Post() create(@CurrentUser() u: AuthUser, @Body() b: unknown) { return this.service.create(u.id, b); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.get(u.id, id); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: unknown) { return this.service.update(u.id, id, b); }
  @Delete(':id') disable(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.disable(u.id, id); }
}
