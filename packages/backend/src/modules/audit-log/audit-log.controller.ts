import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuditLogEntry } from './entities/audit-log-entry';

interface PaginatedAuditLogResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({
    description: 'Successfully retrieved audit logs.',
    // Mohli bychom vytvořit dedikované PaginatedAuditLogResponseDto
    // type: PaginatedAuditLogResult, // Toto by vyžadovalo, aby PaginatedAuditLogResult byl třída s dekorátory
  })
  async findAll(@Query() queryDto: AuditLogQueryDto): Promise<PaginatedAuditLogResult> {
    return this.auditLogService.findAll(queryDto);
  }
}
