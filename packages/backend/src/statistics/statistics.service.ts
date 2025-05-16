import { Injectable } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { PurchasesService } from '../purchases/purchases.service';

export interface TotalRevenueStats {
  totalRevenue: number;
  purchaseRevenue: number;
  appointmentRevenue: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async calculateTotalRevenue(): Promise<TotalRevenueStats> {
    const purchaseRevenue = await this.purchasesService.getTotalRevenue();
    const appointmentRevenue = await this.appointmentsService.getTotalRevenueFromCompletedAppointments();
    const totalRevenue = parseFloat((purchaseRevenue + appointmentRevenue).toFixed(2));

    return {
      totalRevenue,
      purchaseRevenue,
      appointmentRevenue,
    };
  }
} 