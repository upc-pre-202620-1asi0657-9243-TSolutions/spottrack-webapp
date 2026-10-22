import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalyticsStat } from '../domain/model/analytics-stat.entity';
import { AnalyticsApiEndpoint } from './analytics-api-endpoint';
import { AnalyticsAssembler } from './analytics-assembler';
import { EquipmentResource } from './analytics-response';

export interface AnalyticsData {
  stats:      AnalyticsStat[];
  equipments: EquipmentResource[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsApi {
  private readonly endpoint:  AnalyticsApiEndpoint;
  private readonly assembler = new AnalyticsAssembler();

  constructor(private readonly http: HttpClient) {
    this.endpoint = new AnalyticsApiEndpoint(http);
  }

  /**
   * Fetches activity reports + equipments in a single round trip and joins
   * them into AnalyticsStat entities. Equipments are also returned raw since
   * AnalyticsStore's machine-type breakdown reads the full equipment list
   * independently of activity reports.
   */
  getAnalyticsData(): Observable<AnalyticsData> {
    return forkJoin({
      reports:    this.endpoint.getActivityReports(),
      equipments: this.endpoint.getEquipments(),
    }).pipe(
      map(({ reports, equipments }) => ({
        stats: this.assembler.toEntitiesFromResources(reports, equipments),
        equipments,
      }))
    );
  }

  requestActivityAnalysis(body: {
    equipmentId: string; minutesActive: number; minutesInactive: number;
    downtimeReason: string; percentageChange: number;
  }): Observable<any> {
    return this.endpoint.requestActivityAnalysis(body);
  }

  requestMaintenanceQuote(body: {
    amount: number; currency: string; costTypeValue: string;
    partName: string; quantity: number; unitPrice: number;
  }): Observable<any> {
    return this.endpoint.requestMaintenanceQuote(body);
  }

  requestROIProjection(body: { expectedRoiPercentage: number }): Observable<any> {
    return this.endpoint.requestROIProjection(body);
  }
}
