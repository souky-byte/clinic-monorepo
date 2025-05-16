import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { PatientsModule } from './patients/patients.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AppointmentTypesModule } from './appointment-types/appointment-types.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ConsultantsModule } from './modules/consultants/consultants.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_1YGFZfM6Qzye@ep-purple-leaf-a2wkzqat-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
      //entities: [], // Zde budeme přidávat entity
      synchronize: true, // POZOR: true pouze pro vývoj, na produkci false a použít migrace!
      autoLoadEntities: true, // Automaticky načte entity definované pomocí forFeature()
      ssl: {
        rejectUnauthorized: false, // Potřebné pro Neon DB, pokud není CA certifikát
      },
    }),
    AuthModule,
    InventoryModule,
    PatientsModule,
    PurchasesModule,
    AppointmentTypesModule,
    AppointmentsModule,
    AuditLogModule,
    ConsultantsModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
