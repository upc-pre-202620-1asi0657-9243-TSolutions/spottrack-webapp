import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Zone } from '../domain/model/zone.entity';

export interface CreateZoneRequest {
  zoneName:         string;
  maximumOccupancy: number;
  branchId:         string;
}

@Injectable({ providedIn: 'root' })
export class ZoneApi {
  private readonly http = inject(HttpClient);

  getZones(gymId: string): Observable<Zone[]> {
    return this.http.get<Zone[]>(
      `${environment.apiBase}/gyms/${gymId}/zones`
    );
  }

  createZone(gymId: string, branchId: string, req: CreateZoneRequest): Observable<Zone> {
    return this.http.post<Zone>(
      `${environment.apiBase}/gyms/${gymId}/branches/${branchId}/zones`,
      req
    );
  }
}
