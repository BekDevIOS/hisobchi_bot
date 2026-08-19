import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { ParserModule } from './parser/parser.module';
import { AiModule } from './ai/ai.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: Joi.object({ NODE_ENV: Joi.string().default('development'), PORT: Joi.number().default(3000), DATABASE_URL: Joi.string().required(), JWT_SECRET: Joi.string().min(20).required(), TELEGRAM_BOT_TOKEN: Joi.string().allow('').default('') }).unknown(true) }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), PrismaModule, AuthModule, UsersModule, SettingsModule, AccountsModule, CategoriesModule, TransactionsModule, DashboardModule, HealthModule, ParserModule, AiModule, TelegramModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
