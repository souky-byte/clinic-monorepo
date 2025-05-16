import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { AuditLogEntry } from './entities/audit-log-entry'; // Opravená cesta
import { AuditLogQueryDto, AuditLogSortBy } from './dto/audit-log-query.dto';

// Interface pro data logovací akce pro lepší typovou kontrolu
export interface LogActionData {
  userId?: number;
  userName?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntry)
    private auditLogRepository: Repository<AuditLogEntry>,
  ) {}

  async logAction(data: LogActionData): Promise<void> {
    try {
      const newLogEntry = this.auditLogRepository.create({
        userId: data.userId,
        userName: data.userName,
        action: data.action,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        // timestamp se nastaví automaticky díky @CreateDateColumn
      });
      await this.auditLogRepository.save(newLogEntry);
    } catch (error) {
      this.logger.error(`Failed to log action: ${data.action}`, error.stack);
      // Zde bychom neměli házet chybu dál, aby logování neovlivnilo hlavní operaci
      // V produkčním prostředí by se sem mohlo přidat např. odeslání do externího logovacího systému
    }
  }

  async findAll(
    queryDto: AuditLogQueryDto,
  ): Promise<{ data: AuditLogEntry[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, sortBy = AuditLogSortBy.TIMESTAMP, sortOrder = 'DESC', user, action, startDate, endDate, search } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('auditLog');

    if (user) {
      const userIdNum = parseInt(user, 10);
      if (!isNaN(userIdNum)) {
        queryBuilder.andWhere('auditLog.userId = :userId', { userId: userIdNum });
      } else {
        queryBuilder.andWhere('auditLog.userName ILIKE :userName', { userName: `%${user}%` });
      }
    }

    if (action) {
      queryBuilder.andWhere('auditLog.action ILIKE :action', { action: `%${action}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('auditLog.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('auditLog.timestamp <= :endDate', { endDate });
    }

    if (search) {
      // Prohledávání JSONB pole 'details'. 
      // Zkoušíme CAST(... AS TEXT) místo ::text
      queryBuilder.andWhere('CAST(auditLog.details AS TEXT) ILIKE :search', { search: `%${search}%` });
    }

    const validSortByFields: Record<AuditLogSortBy, string> = {
      [AuditLogSortBy.TIMESTAMP]: 'auditLog.timestamp',
      [AuditLogSortBy.USER_NAME]: 'auditLog.userName',
      [AuditLogSortBy.ACTION]: 'auditLog.action',
    };
    const safeSortBy = validSortByFields[sortBy] || 'auditLog.timestamp';

    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find audit logs: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching audit logs');
    }
  }
} 