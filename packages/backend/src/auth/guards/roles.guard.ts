import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { User } from '../entities/user.entity'; // Pro typování request.user

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Pokud žádné role nejsou vyžadovány, povol přístup
    }
    const { user } = context.switchToHttp().getRequest<{ user: User }>();

    if (!user || !user.role) {
        // Toto by se nemělo stát, pokud je RolesGuard použit po AuthGuard('jwt')
        throw new ForbiddenException('User role not found for authorization.'); 
    }
    
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);
    if (!hasRequiredRole) {
        throw new ForbiddenException('You do not have the required role to access this resource.');
    }
    return true;
  }
} 