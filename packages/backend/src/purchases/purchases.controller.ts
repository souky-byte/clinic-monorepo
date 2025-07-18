import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Purchase } from './entities/purchase.entity';
import { PurchaseQueryDto } from './dto/purchase-query.dto';

@Controller('purchases')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPurchaseDto: CreatePurchaseDto, @GetUser() currentUser: User): Promise<Purchase> {
    return this.purchasesService.create(createPurchaseDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  findAll(
    @Query() queryDto: PurchaseQueryDto,
    @GetUser() currentUser: User,
  ): Promise<{ data: Purchase[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.purchasesService.findAll(queryDto, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ): Promise<Purchase> {
    return this.purchasesService.findOne(id, currentUser);
  }
}
