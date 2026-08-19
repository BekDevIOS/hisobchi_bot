import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query('type') type?: CategoryType) { return this.service.list(u.id, type); }
}
