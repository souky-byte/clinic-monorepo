import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService, TotalRevenueStats } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('total-revenue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Get total revenue statistics', 
    description: 'Calculates and returns the total revenue from all purchases and completed appointments. Also provides a breakdown of revenue from purchases and appointments separately.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved total revenue statistics.',
    schema: {
      type: 'object',
      properties: {
        totalRevenue: { type: 'number', example: 15250.75 },
        purchaseRevenue: { type: 'number', example: 10000.50 },
        appointmentRevenue: { type: 'number', example: 5250.25 },
      },
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource. User does not have the right role.' })
  async getTotalRevenue(): Promise<TotalRevenueStats> {
    return this.statisticsService.calculateTotalRevenue();
  }
} 