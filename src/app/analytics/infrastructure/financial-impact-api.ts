import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { FinancialStat } from '../domain/model/financial-impact.entity';
import { FinancialImpactApiEndpoint } from './financial-impact-api-endpoint';
import { FinancialImpactAssembler } from './financial-impact-assembler';
import { MaintenanceTicketResource, MaintenanceLogResource, MaintenanceQuoteResource } from './financial-impact-response';

export interface FinancialImpactData {
  stats:   FinancialStat[];
  tickets: MaintenanceTicketResource[];
  logs:    MaintenanceLogResource[];
  quotes:  MaintenanceQuoteResource[];
}

@Injectable({ providedIn: 'root' })
export class FinancialImpactApi {
  private readonly endpoint:  FinancialImpactApiEndpoint;
  private readonly assembler = new FinancialImpactAssembler();

  constructor(private readonly http: HttpClient) {
    this.endpoint = new FinancialImpactApiEndpoint(http);
  }

  /**
   * Fetches equipments + activity reports + maintenance data in one round
   * trip. Equipment/activity-report resources are joined into FinancialStat
   * entities; tickets/logs/quotes stay raw since there's no domain entity
   * for them yet.
   */
  getFinancialImpactData(): Observable<FinancialImpactData> {
    return forkJoin({
      equipments: this.endpoint.getEquipments(),
      reports:    this.endpoint.getActivityReports(),
      tickets:    this.endpoint.getMaintenanceTickets(),
      logs:       this.endpoint.getMaintenanceLogs(),
      quotes:     this.endpoint.getMaintenanceQuotes(),
    }).pipe(
      map(({ equipments, reports, tickets, logs, quotes }) => ({
        stats: this.assembler.toEntitiesFromResources(equipments, reports),
        tickets,
        logs,
        quotes,
      }))
    );
  }
}
