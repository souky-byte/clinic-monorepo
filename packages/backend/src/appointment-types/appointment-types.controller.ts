import { Controller, UseGuards, Post, Body, HttpCode, HttpStatus, Get, UseInterceptors, ClassSerializerInterceptor, Param, ParseIntPipe, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppointmentTypesService } from './appointment-types.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { AppointmentType } from './entities/appointment-type.entity';
import { AppointmentTypeResponseDto } from './dto/appointment-type-response.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';

@ApiTags('Appointment Types')
@Controller('appointment-types')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class AppointmentTypesController {
  constructor(private readonly appointmentTypesService: AppointmentTypesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDto: CreateAppointmentTypeDto,
    @GetUser() currentUser: User,
  ): Promise<AppointmentType> {
    return this.appointmentTypesService.create(createDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  async findAll(@GetUser() currentUser: User): Promise<AppointmentTypeResponseDto[]> {
    return this.appointmentTypesService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ): Promise<AppointmentTypeResponseDto> {
    return this.appointmentTypesService.findOne(id, currentUser);
  }

  @Get('consultant/:consultantId')
  @ApiOperation({ summary: 'Get appointment types visible to a specific consultant (for patients, admins, consultants)' })
  @ApiParam({ name: 'consultantId', description: 'ID of the consultant whose appointment types are to be fetched', type: Number, example: 1 })
  @ApiOkResponse({
    description: 'Successfully retrieved appointment types for the consultant.',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/AppointmentTypeResponseDto' }, // Assumes AppointmentTypeResponseDto is globally registered
      example: [
        {
          id: 1,
          name: "První konzultace",
          description: "Úvodní sezení pro nové klienty.",
          price: 1500,
          durationMinutes: 60,
          visibleToAll: true,
          color: "#FFD700",
          requiresProducts: false,
          visibleTo: [],
          appointmentsCount: 10,
          createdAt: "2023-01-15T10:00:00.000Z",
          updatedAt: "2023-01-15T10:00:00.000Z",
          version: 1
        },
        {
          id: 2,
          name: "Kontrolní schůzka",
          description: "Pravidelná kontrola.",
          price: 1000,
          durationMinutes: 45,
          visibleToAll: false,
          color: "#ADD8E6",
          requiresProducts: true,
          visibleTo: [2],
          appointmentsCount: 25,
          createdAt: "2023-01-16T11:00:00.000Z",
          updatedAt: "2023-01-16T11:30:00.000Z",
          version: 1
        }
      ]
    }
  })
  @ApiNotFoundResponse({
    description: 'Consultant not found or is not a consultant.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Consultant with ID \"999\" not found or is not a consultant.',
        error: 'Not Found'
      }
    }
  })
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.CONSULTANT)
  async findAllForConsultant(
    @Param('consultantId', ParseIntPipe) consultantId: number,
  ): Promise<AppointmentTypeResponseDto[]> {
    return this.appointmentTypesService.findAllVisibleToConsultant(consultantId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAppointmentTypeDto,
    @GetUser() currentUser: User,
  ): Promise<AppointmentTypeResponseDto> {
    return this.appointmentTypesService.update(id, updateDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ): Promise<void> {
    await this.appointmentTypesService.remove(id, currentUser);
  }

  // Zde budou endpointy
} 