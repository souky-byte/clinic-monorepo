import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryItem } from './entities/inventory-item.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService, TypeOrmModule.forFeature([InventoryItem])]
})
export class InventoryModule {}
