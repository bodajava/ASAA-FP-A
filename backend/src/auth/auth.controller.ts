import {
  Controller,
  Post,
  Body,
  Headers,
  Ip,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
// Express Response is only needed for the `res.cookie()` type hint

type ExpressRes = any;
import { AuthService, AuthUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant ID is required for multi-tenant isolation',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns tokens and user data.',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing x-tenant-id header or invalid payload.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or inactive account.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-tenant-id') tenantIdHeader?: string,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
    @Res({ passthrough: true }) res?: ExpressRes,
  ) {
    if (!tenantIdHeader) {
      throw new BadRequestException('x-tenant-id header is required for login');
    }

    let tenantId: bigint;
    try {
      tenantId = BigInt(tenantIdHeader);
    } catch {
      throw new BadRequestException(
        'Invalid x-tenant-id header. Must be a numeric value.',
      );
    }

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      tenantId,
    );
    const result = await this.authService.login(user, ipAddress, userAgent);

    if (res) {
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(
    @Body() refreshTokenDto?: RefreshTokenDto,
    @Request() req?: ExpressRequest,
    @Res({ passthrough: true }) res?: ExpressRes,
  ) {
    const token = refreshTokenDto?.refreshToken || req?.cookies?.refresh_token;
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    const result = await this.authService.refresh(token);

    if (res) {
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(
    @Request() req: RequestWithUser,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
    @Res({ passthrough: true }) res?: ExpressRes,
  ) {
    const result = await this.authService.logout(
      req.user,
      ipAddress,
      userAgent,
    );

    if (res) {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });
    }

    return result;
  }
}
