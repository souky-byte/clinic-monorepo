import { Controller, UseGuards, Post, Body, HttpCode, HttpStatus, Get, UseInterceptors, ClassSerializerInterceptor, Param, ParseIntPipe, Put, Delete } from '@nestjs/common';
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