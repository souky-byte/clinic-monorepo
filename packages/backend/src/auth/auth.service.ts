import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, Logger, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { AuditLogService, LogActionData } from '../modules/audit-log/audit-log.service';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>> {
    const { name, email, password, role } = createUserDto;
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const userEntity = this.usersRepository.create({
      name,
      email,
      password, // Heslo se hashuje automaticky díky @BeforeInsert v entitě
      role,
    });
    try {
      await this.usersRepository.save(userEntity);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, hashedRefreshToken: __, ...result } = userEntity;
      
      this.auditLogService.logAction({
        userId: result.id, // ID nově vytvořeného uživatele
        userName: result.name,
        action: 'USER_CREATED',
        details: { email: result.email, role: result.role },
      });

      return result;
    } catch (error) {
        this.logger.error(`Failed to create user: ${(error as Error).message}`, (error as Error).stack);
        // Zde bychom mohli také logovat selhání do audit logu, pokud je to relevantní
        throw new InternalServerErrorException('Error creating user');
    }
  }

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await user.validatePassword(pass))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, hashedRefreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string, user: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> }> {
    const { email, password } = loginDto;
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
        this.auditLogService.logAction({
            action: 'LOGIN_FAILED_USER_NOT_FOUND',
            details: { email },
            // ipAddress a userAgent by se měly získat z requestu, pokud je to možné
        });
        throw new UnauthorizedException('Invalid credentials - user not found');
    }
    
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
        this.auditLogService.logAction({
            userId: user.id,
            userName: user.name,
            action: 'LOGIN_FAILED_WRONG_PASSWORD',
            details: { email },
        });
        throw new UnauthorizedException('Invalid credentials - wrong password');
    }

    // Úspěšné přihlášení
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { 
        secret: process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_CHANGE_ME_IN_PROD', 
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h' 
    });
    const rawRefreshToken = this.jwtService.sign(payload, { 
        secret: process.env.JWT_REFRESH_SECRET || 'YOUR_SUPER_SECRET_REFRESH_KEY_CHANGE_ME_IN_PROD', 
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d' 
    });
    user.hashedRefreshToken = await argon2.hash(rawRefreshToken);
    user.lastActive = new Date(); // Aktualizace lastActive
    try {
      await this.usersRepository.save(user);
    } catch (error) {
      this.logger.error(`Failed to save refresh token or lastActive for user ${user.email}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Login process failed while updating user data');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, hashedRefreshToken: __, ...userResult } = user;

    this.auditLogService.logAction({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN_SUCCESS',
      details: { email: user.email },
      // Zde by bylo ideální získat IP a User-Agent z requestu
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: userResult,
    };
  }

  async refreshToken(userId: number, providedRefreshToken: string): Promise<{ accessToken: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || !user.hashedRefreshToken) {
      this.auditLogService.logAction({ userId, action: 'REFRESH_TOKEN_FAILED_NO_USER_OR_TOKEN' });
      throw new UnauthorizedException('Access Denied. No refresh token on record.');
    }

    const isValidRefreshToken = await argon2.verify(user.hashedRefreshToken, providedRefreshToken);

    if (!isValidRefreshToken) {
      this.auditLogService.logAction({ userId, userName: user.name, action: 'REFRESH_TOKEN_FAILED_INVALID' });
      throw new UnauthorizedException('Access Denied. Invalid refresh token.');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { 
        secret: process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_CHANGE_ME_IN_PROD', 
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h' 
    });

    this.auditLogService.logAction({ userId, userName: user.name, action: 'REFRESH_TOKEN_SUCCESS' });
    return { accessToken };
  }

  async logout(userId: number): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (user) {
      user.hashedRefreshToken = undefined;
      await this.usersRepository.save(user);
      this.auditLogService.logAction({ userId, userName: user.name, action: 'LOGOUT_SUCCESS' });
    }
  }

  async findUserByIdForAuth(id: number): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    // Nejprve načteme uživatele, abychom znali jeho roli
    const userWithRole = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'role'], // Stačí nám ID a role pro rozhodnutí
    });

    if (!userWithRole) {
      return null;
    }

    const findOptions: import('typeorm').FindOneOptions<User> = { where: { id } };
    if (userWithRole.role === UserRole.PATIENT) {
      findOptions.relations = ['patientProfile'];
    }

    const user = await this.usersRepository.findOne(findOptions);

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, hashedRefreshToken, validatePassword, hashPassword, ...result } = user;
      return result as Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>;
    }
    return null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async requestPasswordReset(email: string): Promise<{ message: string; resetTokenForTesting?: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      // Zde nelogujeme do audit logu identitu, abychom neprozradili neexistenci emailu
      // Ale můžeme zalogovat samotný pokus (bez userId/userName)
      this.auditLogService.logAction({
        action: 'PASSWORD_RESET_REQUESTED_USER_NOT_FOUND',
        details: { emailAttempted: email },
        // ipAddress, userAgent z requestu
      });
      return { message: 'If your email address exists in our database, you will receive a password reset link.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = await argon2.hash(rawToken); 
    user.passwordResetExpires = new Date(Date.now() + 3600000); 

    try {
      await this.usersRepository.save(user);
      this.logger.log(`Password reset token generated for ${email}. Token (for testing): ${rawToken}`);
      
      this.auditLogService.logAction({
        userId: user.id,
        userName: user.name,
        action: 'PASSWORD_RESET_REQUESTED_SUCCESS',
        details: { email: user.email },
        // ipAddress, userAgent z requestu
      });

      return { 
        message: 'If your email address exists in our database, you will receive a password reset link.',
        resetTokenForTesting: rawToken 
      };
    } catch (error) {
      this.logger.error(`Failed to save password reset token for user ${email}: ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
        userId: user?.id, // Může být null, pokud se user nepodařilo načíst výše, ale zde by měl existovat
        userName: user?.name,
        action: 'PASSWORD_RESET_REQUEST_FAILED_DB_ERROR',
        details: { email: email, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error processing password reset request.');
    }
  }

  async resetPassword(resetPasswordDto: PasswordResetDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Hledáme všechny uživatele, kteří by mohli mít platný token, abychom pak ověřili konkrétní token.
    // Toto není nejefektivnější, ale je to bezpečnější než ukládat raw tokeny nebo porovnávat hashe přímo od klienta.
    const potentialUsers = await this.usersRepository.find({
      where: {
        passwordResetExpires: MoreThan(new Date()), // Token je stále platný
      },
    });

    let userToReset: User | null = null;
    for (const potentialUser of potentialUsers) {
      if (potentialUser.passwordResetToken && (await argon2.verify(potentialUser.passwordResetToken, token))) {
        userToReset = potentialUser;
        break;
      }
    }

    if (!userToReset) {
      this.auditLogService.logAction({
        action: 'PASSWORD_RESET_FAILED_INVALID_OR_EXPIRED_TOKEN',
        details: { tokenUsed: token },
      });
      throw new BadRequestException('Password reset token is invalid or has expired.');
    }

    userToReset.password = password; 
    userToReset.passwordResetToken = undefined;
    userToReset.passwordResetExpires = undefined; 
    await this.usersRepository.save(userToReset);

    this.auditLogService.logAction({
      userId: userToReset.id,
      userName: userToReset.name,
      action: 'PASSWORD_RESET_SUCCESS',
      details: { email: userToReset.email },
    });
  }
}
