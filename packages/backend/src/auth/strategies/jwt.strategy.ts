import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity'; // Pro typování

export interface JwtPayload {
  email: string;
  sub: number;
  role: string; // Nebo UserRole enum, pokud ho chceme používat striktněji
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) { // AuthService pro případné načtení dalších dat o uživateli
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_CHANGE_ME_IN_PROD',
    });
  }

  async validate(payload: JwtPayload): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    // console.log('JwtStrategy validate PAYLOAD:', JSON.stringify(payload)); // REMOVE THIS
    
    // Payload obsahuje { email, sub, role, iat, exp }
    // Můžeme zde načíst kompletního uživatele z databáze, pokud je to potřeba,
    // nebo jen vrátit část payloadu, pokud stačí.
    // V našem případě AuthService.validateUser již vrací ořezaného uživatele, ale to bylo pro login.
    // Zde můžeme chtít načíst čerstvá data uživatele podle ID (payload.sub).
    
    // Příklad: Načtení uživatele z DB (pokud bychom chtěli čerstvá data)
    // const user = await this.authService.findUserById(payload.sub);
    // if (!user) {
    //   throw new UnauthorizedException();
    // }
    // return user; // Vrátí kompletního (ořezaného) uživatele

    // Prozatím, pokud payload stačí pro základní identifikaci, můžeme vrátit jen relevantní části z něj
    // nebo, pokud chceme konzistentní user object jako při loginu, musíme ho načíst.
    // Podle specifikace /api/auth/me má vracet {id, name, email, role, lastActive}
    // Takže načtení uživatele z DB je vhodnější.

    const user = await this.authService.findUserByIdForAuth(payload.sub);
    // console.log('JwtStrategy validate USER FROM SERVICE:', user ? JSON.stringify(user) : null); // REMOVE THIS
    if (!user) {
      // console.error('JwtStrategy: User not found by findUserByIdForAuth, payload.sub:', payload.sub); // Keep or remove optional error log
      throw new UnauthorizedException('User not found or token invalid');
    }
    return user; // AuthService.findUserByIdForAuth by měl vrátit uživatele ve formátu pro /me
  }
} 