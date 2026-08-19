import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({ imports: [AuthModule], controllers: [CategoriesController], providers: [CategoriesService, JwtAuthGuard], exports: [CategoriesService] })
export class CategoriesModule {}
