import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import * as ms from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'Missing required environment variable: JWT_SECRET. ' +
    'Set a strong random string (minimum 32 characters) before starting the server.',
  );
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRATION ??
          '15m') as ms.StringValue,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
