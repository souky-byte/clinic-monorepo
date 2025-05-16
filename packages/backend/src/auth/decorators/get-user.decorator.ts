import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity'; // Upravte cestu podle potřeby

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Předpokládá se, že JwtStrategy připojí uživatele (nebo jeho část) k request.user
  },
); 