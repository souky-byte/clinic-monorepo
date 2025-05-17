import { Controller, UseGuards, Post, Body, HttpCode, HttpStatus, Get, Query, Param, ParseIntPipe, Put, Delete, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarAppointmentItemDto } from './dto/calendar-appointment-item.dto';
import { TestQueryDto } from './dto/test-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBody, ApiParam, ApiNotFoundResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { PaginatedAppointmentsResponseDto } from '../patients/dto/paginated-appointments-response.dto';
import { BookAppointmentDto } from './dto'; // Changed import to use barrel file

@ApiTags('Appointments Management')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(AuthGuard('jwt'))
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiCreatedResponse({ description: 'Appointment created successfully.', type: Appointment })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: CreateAppointmentDto })
  @HttpCode(HttpStatus.CREATED)
  create( // This is the 'create' method for admins/consultants, should be associated with the @Post() above
    @Body() createDto: CreateAppointmentDto,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    return this.appointmentsService.create(createDto, currentUser);
  }

  // Method for patients to book appointments
  @Post('book')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Book an available appointment slot (for patients)' })
  @ApiCreatedResponse({ description: 'Appointment booked successfully.', type: Appointment })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: BookAppointmentDto })
  @HttpCode(HttpStatus.CREATED)
  async bookAppointmentByPatient(
    @Body() bookDto: BookAppointmentDto,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    if (currentUser.role !== UserRole.PATIENT) {
        throw new ForbiddenException('Only patients can book appointments through this endpoint.');
    }
    return this.appointmentsService.bookAppointment(bookDto, currentUser);
  }

  // Note: The 'create' method for admins/consultants is now correctly defined above, associated with the first @Post() decorator.

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a paginated list of appointments' })
  @ApiOkResponse({ description: 'Successfully retrieved appointments.', type: PaginatedAppointmentsResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async findAll(
    @Query() queryDto: AppointmentQueryDto,
    @GetUser() currentUser: User,
  ): Promise<PaginatedAppointmentsResponseDto> {
    const { data, total, page, limit, totalPages } = await this.appointmentsService.findAll(queryDto, currentUser);
    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  @Get('calendar')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get appointments formatted for calendar view' })
  @ApiOkResponse({ description: 'Successfully retrieved calendar appointments.', type: [CalendarAppointmentItemDto] })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  getCalendarAppointments(
    @Query() queryDto: CalendarQueryDto,
    @GetUser() currentUser: User,
  ): Promise<CalendarAppointmentItemDto[]> {
    return this.appointmentsService.getCalendarAppointments(queryDto, currentUser);
  }

  @Get('test-validation')
  @ApiOperation({ summary: '[Testing Only] Test validation endpoint' })
  @ApiOkResponse({ description: 'Validation test response' })
  testValidation(@Query() queryDto: TestQueryDto): any {
    console.log(`Test validation endpoint hit with DTO: ${JSON.stringify(queryDto)}`);
    return { message: 'Validation passed for TestQueryDto', receivedData: queryDto };
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get my appointments (for patient or consultant)' })
  @ApiOkResponse({ description: 'Successfully retrieved my appointments.', type: [Appointment] })
  @ApiForbiddenResponse({ description: 'Forbidden if profile not found for patient.' })
  async findMyAppointments(
    @GetUser() currentUser: User,
    @Query() queryDto: AppointmentQueryDto,
  ): Promise<Appointment[]> {
    return this.appointmentsService.findMyNestedAppointments(currentUser, queryDto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a specific appointment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the appointment to retrieve', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved appointment.', type: Appointment })
  @ApiNotFoundResponse({ description: 'Appointment not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    return this.appointmentsService.findOne(id, currentUser);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Update an existing appointment' })
  @ApiParam({ name: 'id', description: 'ID of the appointment to update', type: Number })
  @ApiOkResponse({ description: 'Appointment updated successfully.', type: Appointment })
  @ApiNotFoundResponse({ description: 'Appointment not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ 
    type: UpdateAppointmentDto,
    description: 'Fields to update for the appointment. All fields are optional.',
    examples: { // Using examples for better structure
      'Update date and notes': {
        summary: 'Change date and notes',
        value: { 
          date: '2024-01-10T10:00:00.000Z', 
          notes: 'Updated notes: Patient rescheduled.' 
        }
      },
      'Update products': {
        summary: 'Change associated products',
        value: { 
          products: [{ inventoryItemId: 1, quantity: 1 }] // Replace products
        }
      },
       'Update consultant': {
        summary: 'Change assigned consultant (Admin only)',
        value: { 
          consultantId: 3
        }
      }
    }
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    return this.appointmentsService.update(id, updateAppointmentDto, currentUser);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Update the status of an appointment' })
  @ApiParam({ name: 'id', description: 'ID of the appointment to update status for', type: Number })
  @ApiOkResponse({ description: 'Appointment status updated successfully.', type: Appointment })
  @ApiNotFoundResponse({ description: 'Appointment not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: UpdateAppointmentStatusDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateAppointmentStatusDto,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    return this.appointmentsService.updateStatus(id, updateStatusDto, currentUser);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiParam({ name: 'id', description: 'ID of the appointment to cancel', type: Number })
  @ApiOkResponse({ description: 'Appointment cancelled successfully.', type: Appointment })
  @ApiNotFoundResponse({ description: 'Appointment not found or not accessible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ): Promise<Appointment> {
    return this.appointmentsService.deleteAppointment(id, currentUser);
  }
} 