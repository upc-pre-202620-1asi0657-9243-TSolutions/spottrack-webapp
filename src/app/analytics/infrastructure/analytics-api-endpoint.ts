import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityReportResource, EquipmentResource } from './analytics-response';

/**
 * Raw HTTP access for the analytics bounded context. Kept separate from
 * AnalyticsApi so the facade only deals with entity mapping, not transport.
 */
export class AnalyticsApiEndpoint {
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

  requestActivityAnalysis(body: {
    equipmentId: string; minutesActive: number; minutesInactive: number;
    downtimeReason: string; percentageChange: number;
  }): Observable<any> {
    return this.http.post(`${this.base}/activity-reports`, body);
  }

  requestMaintenanceQuote(body: {
    amount: number; currency: string; costTypeValue: string;
    partName: string; quantity: number; unitPrice: number;
  }): Observable<any> {
    return this.http.post(`${this.base}/maintenance-quotes`, body);
  }

  requestROIProjection(body: { expectedRoiPercentage: number }): Observable<any> {
    return this.http.post(`${this.base}/roi-projections`, body);
  }
}
