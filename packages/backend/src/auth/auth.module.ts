import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_CHANGE_ME_IN_PROD',
      signOptions: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h' },
    }),
    AuditLogModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [PassportModule, JwtModule, AuthService, TypeOrmModule.forFeature([User])]
})
export class AuthModule {}
