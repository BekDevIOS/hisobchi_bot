import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ imports: [AuthModule], controllers: [DashboardController], providers: [DashboardService, JwtAuthGuard] })
export class DashboardModule {}
