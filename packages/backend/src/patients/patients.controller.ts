import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientProfileDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PatientProfile } from './entities/patient-profile.entity';
import { ParseIntPipe } from '@nestjs/common';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AppointmentQueryDto } from '../appointments/dto/appointment-query.dto';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiCreatedResponse, ApiNoContentResponse, ApiParam, ApiBody } from '@nestjs/swagger'; // Import Swagger
import { PaginatedPatientsResponseDto } from './dto/paginated-patients-response.dto'; // Import Paginated DTO
import { PatientStatsDto } from './dto/patient-stats.dto'; // Import PatientStatsDto
import { PaginatedPurchasesResponseDto } from './dto/paginated-purchases-response.dto'; // Import PaginatedPurchasesResponseDto
import { PaginatedAppointmentsResponseDto } from './dto/paginated-appointments-response.dto'; // Import PaginatedAppointmentsResponseDto

@ApiTags('Patients Management')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Create a new patient record' })
  @ApiCreatedResponse({ description: 'Patient created successfully.', type: PatientProfile })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: CreatePatientDto })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPatientDto: CreatePatientDto, @GetUser() currentUser: User): Promise<PatientProfile> {
    return this.patientsService.create(createPatientDto, currentUser);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get patient statistics (Admin or assigned Consultant)' })
  @ApiOkResponse({ description: 'Successfully retrieved patient statistics.', type: PatientStatsDto })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  getStats(@GetUser() currentUser: User): Promise<PatientStatsDto> {
    return this.patientsService.getStats(currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a paginated list of patients (Admin or assigned Consultant)' })
  @ApiOkResponse({ description: 'Successfully retrieved patients.', type: PaginatedPatientsResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async findAll(
    @Query() queryDto: PatientQueryDto,
    @GetUser() currentUser: User
  ): Promise<PaginatedPatientsResponseDto> {
    const { data, total, page, limit, totalPages } = await this.patientsService.findAll(queryDto, currentUser);
    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a specific patient by ID (Admin or assigned Consultant)' })
  @ApiParam({ name: 'id', description: 'ID of the patient to retrieve', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved patient.', type: PatientProfile })
  @ApiNotFoundResponse({ description: 'Patient not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() currentUser: User): Promise<PatientProfile> {
    return this.patientsService.findOne(id, currentUser);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Update an existing patient profile (Admin or assigned Consultant)' })
  @ApiParam({ name: 'id', description: 'ID of the patient profile to update', type: Number })
  @ApiOkResponse({ description: 'Patient profile updated successfully.', type: PatientProfile })
  @ApiNotFoundResponse({ description: 'Patient profile not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: UpdatePatientProfileDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePatientProfileDto: UpdatePatientProfileDto,
    @GetUser() currentUser: User,
  ): Promise<PatientProfile> {
    return this.patientsService.update(id, updatePatientProfileDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only Admin can delete patients
  @ApiOperation({ summary: 'Soft delete a patient (Admin only)' })
  @ApiParam({ name: 'id', description: 'ID of the patient to soft delete', type: Number })
  @ApiNoContentResponse({ description: 'Patient soft deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can delete patients.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() currentUser: User): Promise<void> {
    await this.patientsService.remove(id, currentUser);
  }

  @Get(':id/purchases')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get purchases for a specific patient (Admin or assigned Consultant)' })
  @ApiParam({ name: 'id', description: 'ID of the patient', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved patient purchases.', type: PaginatedPurchasesResponseDto })
  @ApiNotFoundResponse({ description: 'Patient not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async findPurchases(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: PaginationQueryDto, 
    @GetUser() currentUser: User,
  ): Promise<PaginatedPurchasesResponseDto> {
    const { data, total, page, limit, totalPages } = await this.patientsService.findPurchasesForPatient(id, queryDto, currentUser);
    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  @Get(':id/appointments')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get appointments for a specific patient (Admin or assigned Consultant)' })
  @ApiParam({ name: 'id', description: 'ID of the patient', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved patient appointments.', type: PaginatedAppointmentsResponseDto })
  @ApiNotFoundResponse({ description: 'Patient not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async findAppointments(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: AppointmentQueryDto,
    @GetUser() currentUser: User,
  ): Promise<PaginatedAppointmentsResponseDto> {
    const { data, total, page, limit, totalPages } = await this.patientsService.findAppointmentsForPatient(id, queryDto, currentUser);
    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }
}
