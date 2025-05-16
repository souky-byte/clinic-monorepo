import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { PurchasesModule } from '../purchases/purchases.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuthModule } from '../auth/auth.module'; // For auth guards

@Module({
  imports: [
    AuthModule, // Needed for guards in controller
    PurchasesModule, 
    AppointmentsModule
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {} 