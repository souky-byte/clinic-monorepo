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
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eTQRUoZ2FtG9@ep-curly-scene-a2i7a758-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
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
    WorkingHoursModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
