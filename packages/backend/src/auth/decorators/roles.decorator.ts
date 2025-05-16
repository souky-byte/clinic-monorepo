import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity'; // Upravte cestu podle potřeby

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles); 