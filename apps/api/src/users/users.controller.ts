import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthUser } from '../common/auth.types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me') me(@CurrentUser() user: AuthUser) { return user; }
}
