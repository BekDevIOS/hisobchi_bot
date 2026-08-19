import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({ imports: [AuthModule], controllers: [AccountsController], providers: [AccountsService, JwtAuthGuard], exports: [AccountsService] })
export class AccountsModule {}
