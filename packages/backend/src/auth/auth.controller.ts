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
  @ApiResponse({ status: 200, description: 'Login successful, returns tokens and user info.' })
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
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.OK)
  async logout(@GetUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Successfully logged out' };
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() body: PasswordResetRequestDto): Promise<{ message: string; resetTokenForTesting?: string }> {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: PasswordResetDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been successfully reset.' };
  }
}
