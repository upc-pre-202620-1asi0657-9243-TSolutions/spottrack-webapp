import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GymSummaryResource {
  gymId: string;
  name:  string;
}

@Injectable({ providedIn: 'root' })
export class GymApi {
  private readonly http = inject(HttpClient);

  getAll(): Observable<GymSummaryResource[]> {
    return this.http.get<GymSummaryResource[]>(`${environment.apiBase}/gyms`);
  }
}
