import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertResource } from './alerts-response';

@Injectable({ providedIn: 'root' })
export class AlertsApi {
  private readonly alertsUrl = `${environment.apiBase}/alerts`;

  constructor(private readonly http: HttpClient) {}

  getAlerts(): Observable<AlertResource[]> {
    return this.http.get<AlertResource[]>(this.alertsUrl);
  }

  resolveAlert(alertId: number): Observable<AlertResource> {
    return this.http.patch<AlertResource>(`${this.alertsUrl}/${alertId}/resolve`, {});
  }
}
