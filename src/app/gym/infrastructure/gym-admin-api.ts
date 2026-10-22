import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GymSummaryResource } from './gym-api';

@Injectable({ providedIn: 'root' })
export class GymAdminApi {
  private readonly http = inject(HttpClient);

  getMyGyms(): Observable<GymSummaryResource[]> {
    return this.http.get<GymSummaryResource[]>(`${environment.apiBase}/gyms/me`);
  }

  createGym(gymName: string): Observable<GymSummaryResource> {
    return this.http.post<GymSummaryResource>(`${environment.apiBase}/gyms`, { gymName });
  }
}
