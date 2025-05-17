import { Controller, Get, Put, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { WorkingHours } from './entities/working-hours.entity';
import { CreateWorkingHoursDto, GetSlotsQueryDto, SlotDto } from './dto';

@ApiTags('User Working Hours')
@ApiBearerAuth()
@Controller('working-hours') // Base path /api/working-hours
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get working hours for the currently logged-in user' })
  @ApiOkResponse({ description: 'Successfully retrieved working hours.', type: [WorkingHours] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getMyWorkingHours(@GetUser() currentUser: User): Promise<WorkingHours[]> {
    return this.workingHoursService.getWorkingHoursForUser(currentUser.id, currentUser);
  }

  @Put('me')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Set or update working hours for the currently logged-in user' })
  @ApiOkResponse({ description: 'Working hours set/updated successfully.', type: [WorkingHours] })
  @ApiBody({ type: CreateWorkingHoursDto })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid time format, overlapping intervals)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @HttpCode(HttpStatus.OK)
  async setMyWorkingHours(
    @GetUser() currentUser: User,
    @Body() dto: CreateWorkingHoursDto,
  ): Promise<WorkingHours[]> {
    return this.workingHoursService.setWorkingHoursForUser(currentUser.id, dto, currentUser);
  }

  @Get('user/:userId') // Path /api/working-hours/user/:userId
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get working hours for a specific user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved working hours.', type: [WorkingHours] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an Admin.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserWorkingHours(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() currentUser: User, 
  ): Promise<WorkingHours[]> {
    return this.workingHoursService.getWorkingHoursForUser(userId, currentUser);
  }

  @Put('user/:userId') // Path /api/working-hours/user/:userId
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set or update working hours for a specific user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user', type: Number })
  @ApiOkResponse({ description: 'Working hours set/updated successfully.', type: [WorkingHours] })
  @ApiBody({ type: CreateWorkingHoursDto })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid time format, overlapping intervals)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an Admin.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @HttpCode(HttpStatus.OK)
  async setUserWorkingHours(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateWorkingHoursDto,
    @GetUser() currentUser: User,
  ): Promise<WorkingHours[]> {
    return this.workingHoursService.setWorkingHoursForUser(userId, dto, currentUser);
  }

  @Get('user/:userId/slots')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.PATIENT) // Admins, Consultants (for self), and Patients can get slots
  @ApiOperation({ summary: 'Get available appointment slots for a specific consultant' })
  @ApiParam({ name: 'userId', description: 'ID of the consultant', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved available slots.', type: [SlotDto] })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid date format, missing parameters)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Consultant or AppointmentType not found.' })
  async getAvailableSlotsForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetSlotsQueryDto,
    @GetUser() currentUser: User,
  ): Promise<SlotDto[]> {
    return this.workingHoursService.getAvailableSlots(userId, query, currentUser);
  }
}
 