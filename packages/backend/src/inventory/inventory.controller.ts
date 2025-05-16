import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { RestockInventoryItemDto } from './dto/restock-inventory-item.dto';
import { UpdateInventoryItemVisibilityDto } from './dto/update-inventory-item-visibility.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseIntPipe } from '@nestjs/common'; // Pro transformaci ID z param
import { ApiTags, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiNotFoundResponse, ApiBody, ApiNoContentResponse, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'; // Import Swagger decorators
import { PaginatedInventoryResponseDto } from './dto/paginated-inventory-response.dto'; // Import response DTO
import { InventoryItem } from './entities/inventory-item.entity'; // Import entity for response types
import { InventoryStatsDto } from './dto/inventory-stats.dto'; // Import stats DTO

// Define an interface matching the actual return type of service.findAll for now
// interface FindAllInventoryResponse {
//   data: InventoryItem[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

@ApiTags('Inventory Management') // Group endpoints
@ApiBearerAuth() // All endpoints require auth
@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Aplikujeme guardy na celý controller
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new inventory item (Admin only)' })
  @ApiCreatedResponse({ description: 'Inventory item created successfully.', type: InventoryItem })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can create items.' })
  @ApiBody({ type: CreateInventoryItemDto })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInventoryItemDto: CreateInventoryItemDto, @GetUser() user: User): Promise<InventoryItem> { // Return type InventoryItem
    // Aktuálně currentUser v service create není explicitně pro oprávnění, ale pro kontext
    return this.inventoryService.create(createInventoryItemDto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a paginated list of inventory items' })
  @ApiOkResponse({ description: 'Successfully retrieved inventory items.', type: PaginatedInventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async findAll(@Query() queryDto: InventoryQueryDto, @GetUser() user: User): Promise<PaginatedInventoryResponseDto> {
    const { data, total, page, limit, totalPages } = await this.inventoryService.findAll(queryDto, user);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiOkResponse({ description: 'Successfully retrieved inventory statistics.', type: InventoryStatsDto })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  getStats(@GetUser() user: User): Promise<InventoryStatsDto> { // Adjusted return type
    return this.inventoryService.getStats(user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a specific inventory item by ID' })
  @ApiParam({ name: 'id', description: 'ID of the inventory item to retrieve', type: Number })
  @ApiOkResponse({ description: 'Successfully retrieved inventory item.', type: InventoryItem })
  @ApiNotFoundResponse({ description: 'Inventory item not found or not visible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User): Promise<InventoryItem> { // Return type InventoryItem
    return this.inventoryService.findOne(id, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing inventory item (Admin only)' })
  @ApiParam({ name: 'id', description: 'ID of the inventory item to update', type: Number })
  @ApiOkResponse({ description: 'Inventory item updated successfully.', type: InventoryItem })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can update items.' })
  @ApiBody({ type: UpdateInventoryItemDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
    @GetUser() user: User,
  ): Promise<InventoryItem> { // Return type InventoryItem
    return this.inventoryService.update(id, updateInventoryItemDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an inventory item (Admin only)' })
  @ApiParam({ name: 'id', description: 'ID of the inventory item to delete', type: Number })
  @ApiNoContentResponse({ description: 'Inventory item deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can delete items.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User): Promise<void> { // Správný návratový typ {
    return this.inventoryService.remove(id, user);
  }

  @Post(':id/restock')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Add stock to an inventory item' })
  @ApiParam({ name: 'id', description: 'ID of the item to restock', type: Number })
  @ApiOkResponse({ description: 'Stock added successfully.', type: InventoryItem })
  @ApiNotFoundResponse({ description: 'Inventory item not found or not visible.' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiBody({ type: RestockInventoryItemDto })
  restock(
    @Param('id', ParseIntPipe) id: number,
    @Body() restockDto: RestockInventoryItemDto,
    @GetUser() user: User,
  ): Promise<InventoryItem> { // Return type InventoryItem
    return this.inventoryService.restock(id, restockDto, user);
  }

  @Put(':id/visibility')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update visibility settings for an inventory item (Admin only)' })
  @ApiParam({ name: 'id', description: 'ID of the item to update visibility for', type: Number })
  @ApiOkResponse({ description: 'Visibility updated successfully.' /* No specific response body */ })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  @ApiForbiddenResponse({ description: 'Forbidden. Only admins can update visibility.' })
  @ApiBody({ type: UpdateInventoryItemVisibilityDto })
  @HttpCode(HttpStatus.OK)
  updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVisibilityDto: UpdateInventoryItemVisibilityDto,
    @GetUser() user: User,
  ): Promise<void> {
    return this.inventoryService.updateVisibility(id, updateVisibilityDto, user);
  }
}
