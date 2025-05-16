import { Controller, UseGuards, Post, Body, HttpCode, HttpStatus, Get, Query, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ConsultantsService } from './consultants.service';
import { ApiTags, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiConflictResponse, ApiOkResponse, ApiNotFoundResponse, ApiBody, ApiNoContentResponse, ApiOperation, ApiParam, ApiBadRequestResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, User } from '../../auth/entities/user.entity';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { ConsultantQueryDto } from './dto/consultant-query.dto';
import { UpdateConsultantDto } from './dto/update-consultant.dto';
import { ResetConsultantPasswordDto } from './dto/reset-consultant-password.dto';
import { ConsultantInventoryVisibilityDto } from './dto/consultant-inventory-visibility.dto';
import { UpdateConsultantInventoryVisibilityDto } from './dto/update-consultant-inventory-visibility.dto';
import { ConsultantAppointmentTypeVisibilityDto } from './dto/consultant-appointment-type-visibility.dto';
import { UpdateConsultantAppointmentTypesVisibilityDto } from './dto/update-consultant-appointment-types-visibility.dto';
import { ConsultantStatsDto } from './dto/consultant-stats.dto';

interface PaginatedConsultantsResult {
  data: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('Consultants Management')
@ApiBearerAuth()
@Controller('consultants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultantsController {
  constructor(private readonly consultantsService: ConsultantsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Consultant/User created successfully.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can create users here.' })
  @ApiConflictResponse({ description: 'Conflict. User with this email already exists.' })
  async create(
    @Body() createConsultantDto: CreateConsultantDto,
    @GetUser() currentUser: User,
  ): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>> {
    return this.consultantsService.create(createConsultantDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'Successfully retrieved list of consultants.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can list consultants.' })
  async findAll(@Query() queryDto: ConsultantQueryDto): Promise<PaginatedConsultantsResult> {
    return this.consultantsService.findAll(queryDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'Successfully retrieved consultant details.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can view consultant details.' })
  @ApiNotFoundResponse({ description: 'Consultant not found or is not a consultant.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    return this.consultantsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'Consultant/User updated successfully.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can update users here.' })
  @ApiNotFoundResponse({ description: 'User not found or is not a manageable role.' })
  @ApiConflictResponse({ description: 'Conflict. User with this email already exists.' })
  @ApiBody({ type: UpdateConsultantDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsultantDto: UpdateConsultantDto,
    @GetUser() currentUser: User,
  ): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    return this.consultantsService.update(id, updateConsultantDto, currentUser);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password for the user has been successfully reset.'})
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can reset passwords.' })
  @ApiNotFoundResponse({ description: 'User not found or not a role whose password can be reset.' })
  @ApiBody({ type: ResetConsultantPasswordDto })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetConsultantPasswordDto,
    @GetUser() currentUser: User,
  ): Promise<void> {
    return this.consultantsService.resetPasswordByAdmin(id, resetPasswordDto, currentUser);
  }

  @Get(':id/inventory')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get inventory visibility for a specific consultant (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Consultant ID' })
  @ApiOkResponse({ type: [ConsultantInventoryVisibilityDto], description: 'List of inventory items with their visibility status for the consultant.' })
  @ApiNotFoundResponse({ description: 'Consultant not found.' })
  async getConsultantInventoryVisibility(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConsultantInventoryVisibilityDto[]> {
    return this.consultantsService.getConsultantInventoryVisibility(id);
  }

  @Put(':id/inventory')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update inventory visibility for a specific consultant (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Consultant ID' })
  @ApiBody({ type: UpdateConsultantInventoryVisibilityDto })
  @ApiOkResponse({ description: 'Consultant inventory visibility updated successfully.' })
  @ApiNotFoundResponse({ description: 'Consultant or some inventory items not found.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  async updateConsultantInventoryVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConsultantInventoryVisibilityDto,
    @GetUser() currentUser: User,
  ): Promise<void> {
    await this.consultantsService.updateConsultantInventoryVisibility(
      id,
      updateDto.inventoryItemIds || [],
      currentUser,
    );
  }

  @Get(':id/appointment-types')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get appointment types visibility for a specific consultant (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Consultant ID' })
  @ApiOkResponse({ type: [ConsultantAppointmentTypeVisibilityDto], description: 'List of appointment types with their visibility status for the consultant.' })
  @ApiNotFoundResponse({ description: 'Consultant not found.' })
  async getConsultantAppointmentTypesVisibility(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConsultantAppointmentTypeVisibilityDto[]> {
    return this.consultantsService.getConsultantAppointmentTypesVisibility(id);
  }

  @Put(':id/appointment-types')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update appointment types visibility for a specific consultant (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Consultant ID' })
  @ApiBody({ type: UpdateConsultantAppointmentTypesVisibilityDto })
  @ApiOkResponse({ description: 'Consultant appointment types visibility updated successfully.' })
  @ApiNotFoundResponse({ description: 'Consultant or some appointment types not found.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  async updateConsultantAppointmentTypesVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConsultantAppointmentTypesVisibilityDto,
    @GetUser() currentUser: User,
  ): Promise<void> {
    await this.consultantsService.updateConsultantAppointmentTypesVisibility(
      id,
      updateDto.appointmentTypeIds || [],
      currentUser,
    );
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get statistics for a specific consultant (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Consultant ID' })
  @ApiOkResponse({ type: ConsultantStatsDto, description: 'Successfully retrieved consultant statistics.' })
  @ApiNotFoundResponse({ description: 'Consultant not found.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can access this resource.' })
  async getConsultantStats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConsultantStatsDto> {
    return this.consultantsService.getConsultantStats(id);
  }

  // Zde budou metody controlleru
}
