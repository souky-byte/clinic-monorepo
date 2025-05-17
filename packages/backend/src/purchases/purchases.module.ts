import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';
import { AppointmentProductItem } from '../appointments/entities/appointment-product-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, PurchaseItem, AppointmentProductItem]),
    AuthModule,
    forwardRef(() => PatientsModule),
    forwardRef(() => InventoryModule),
    AuditLogModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService, TypeOrmModule.forFeature([Purchase, PurchaseItem, AppointmentProductItem])]
})
export class PurchasesModule {}
