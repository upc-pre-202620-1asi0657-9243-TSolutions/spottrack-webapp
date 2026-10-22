import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityReportResource,
  EquipmentResource,
  MaintenanceTicketResource,
  MaintenanceLogResource,
  MaintenanceQuoteResource,
} from './financial-impact-response';

/**
 * Raw HTTP access for the financial-impact view. Kept separate from
 * FinancialImpactApi so the facade only deals with entity mapping.
 */
export class FinancialImpactApiEndpoint {
  private readonly base: string;

  constructor(private readonly http: HttpClient) {
    this.base = environment.apiBase;
  }

  getActivityReports(): Observable<ActivityReportResource[]> {
    return this.http.get<ActivityReportResource[]>(`${this.base}/activity-reports/me`);
  }

  getEquipments(): Observable<EquipmentResource[]> {
    return this.http.get<EquipmentResource[]>(`${this.base}/equipments`);
  }

  getMaintenanceTickets(): Observable<MaintenanceTicketResource[]> {
    return this.http.get<MaintenanceTicketResource[]>(`${this.base}/maintenance/tickets`);
  }

  getMaintenanceLogs(): Observable<MaintenanceLogResource[]> {
    return this.http.get<MaintenanceLogResource[]>(`${this.base}/maintenance/logs`);
  }

  getMaintenanceQuotes(): Observable<MaintenanceQuoteResource[]> {
    return this.http.get<MaintenanceQuoteResource[]>(`${this.base}/maintenance-quotes/me`);
  }
}
