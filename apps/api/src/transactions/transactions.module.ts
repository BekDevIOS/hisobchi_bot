import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { CategoriesModule } from '../categories/categories.module';
import { ParserModule } from '../parser/parser.module';
import { AiModule } from '../ai/ai.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({ imports: [AuthModule, CategoriesModule, ParserModule, AiModule], controllers: [TransactionsController], providers: [TransactionsService, JwtAuthGuard], exports: [TransactionsService] })
export class TransactionsModule {}
