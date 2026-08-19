import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/auth.guard';

@Global()
@Module({
  imports: [ConfigModule, JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow('JWT_SECRET'), signOptions: { expiresIn: config.get<number>('JWT_EXPIRES_IN_SECONDS', 604800) } }) })],
  controllers: [AuthController], providers: [AuthService, JwtAuthGuard], exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
