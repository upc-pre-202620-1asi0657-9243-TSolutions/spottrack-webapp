import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsageHeatmapResource } from './usage-heatmap-response';

/** Usage history built by the backend from real sensor sessions. Dates are inclusive, yyyy-MM-dd. */
@Injectable({ providedIn: 'root' })
export class UsageHeatmapApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/usage-analytics`;

  getGymUsage(gymId: string, from: string, to: string): Observable<UsageHeatmapResource> {
    return this.http.get<UsageHeatmapResource>(`${this.base}/gyms/${gymId}`, { params: this.range(from, to) });
  }

  getBranchUsage(branchId: string, from: string, to: string): Observable<UsageHeatmapResource> {
    return this.http.get<UsageHeatmapResource>(`${this.base}/branches/${branchId}`, { params: this.range(from, to) });
  }

  private range(from: string, to: string): HttpParams {
    return new HttpParams().set('from', from).set('to', to);
  }
}
