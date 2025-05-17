import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User, UserRole } from './entities/user.entity';
import { GetUser } from './decorators/get-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-user')
  @ApiOperation({ summary: 'Create a new user (Admin Only)' })
  @ApiResponse({ status: 201, description: 'User created successfully.', type: User })
  @ApiResponse({ status: 409, description: 'Conflict. User with this email already exists.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only admins can create users.' })
  @ApiBody({ type: CreateUserDto })
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>> {
    return this.authService.createUser(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful, returns tokens and user info.',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBhdGllbnQuYWxwaGEuZGV1eEBleGFtcGxlLmNvbSIsInN1YiI6NSwicm9sZSI6InBhdGllbnQiLCJpYXQiOjE3NDY2MjM1MDAsImV4cCI6MTc0NjYyNzEwMH0.abc123def456'
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBhdGllbnQuYWxwaGEuZGV1eEBleGFtcGxlLmNvbSIsInN1YiI6NSwiaWF0IjoxNzQ2NjIzNTAwLCJleHAiOjE3NDkyMTU1MDB9.xyz789uvw012'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 5 },
            name: { type: 'string', example: 'Patient Alpha' },
            email: { type: 'string', example: 'patient.alpha.deux@example.com' },
            role: { type: 'string', example: 'patient' },
            status: { type: 'string', example: 'active' },
            lastActive: { type: 'string', format: 'date-time', example: '2025-05-07T13:05:44.879Z' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-05-06T16:20:51.170Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-05-07T11:05:44.931Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiBody({ type: LoginDto })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string, user: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> }> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile.', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.OK)
  getMe(@GetUser() user: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>): Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> {
    return user;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully refreshed access token.', type: RefreshTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Access Denied (invalid or missing refresh token).' })
  @ApiBody({ type: RefreshTokenDto })
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req): Promise<RefreshTokenResponseDto> {
    let userId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const oldToken = authHeader.split(' ')[1];
        const decoded = this.authService['jwtService'].decode(oldToken) as JwtPayload;
        if (decoded && typeof decoded.sub === 'number') {
          userId = decoded.sub;
        }
      } catch (e) {
        // Ignorujeme chybu, pokud token nelze dekódovat
      }
    }
    if (!userId) {
        throw new UnauthorizedException('Cannot refresh token without user identification from a previous session.');
    }
    return this.authService.refreshToken(userId, refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out current user (invalidates refresh token)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully logged out.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Successfully logged out'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.OK)
  async logout(@GetUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Successfully logged out' };
  }

  @Post('password/reset-request')
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset request processed. A reset link will be sent to the provided email if it exists in the system.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If your email is registered in our system, you will receive a password reset link.'
        }
      }
    }
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'patient.alpha.deux@example.com'
        }
      },
      required: ['email']
    }
  })
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() body: PasswordResetRequestDto): Promise<{ message: string; resetTokenForTesting?: string }> {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password has been successfully reset.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been successfully reset.'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: '7f58d12e-de3a-4f93-a6c2-90f4920cb2f4'
        },
        newPassword: {
          type: 'string',
          example: 'newSecurePassword456'
        }
      },
      required: ['token', 'newPassword']
    }
  })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: PasswordResetDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been successfully reset.' };
  }
}
