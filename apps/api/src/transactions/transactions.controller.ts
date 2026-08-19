import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionSource } from '@prisma/client';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: Record<string, unknown>) { return this.service.list(u.id, q); }
  @Post() create(@CurrentUser() u: AuthUser, @Body() b: unknown) { return this.service.create(u.id, b); }
  @Post('parse') parse(@CurrentUser() u: AuthUser, @Body() b?: { text?: string; commit?: boolean }) { return this.service.parseAndMaybeCreate(u.id, b?.text ?? '', b?.commit !== false, TransactionSource.WEB); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.get(u.id, id); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: unknown) { return this.service.update(u.id, id, b); }
  @Delete(':id') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.remove(u.id, id); }
}
