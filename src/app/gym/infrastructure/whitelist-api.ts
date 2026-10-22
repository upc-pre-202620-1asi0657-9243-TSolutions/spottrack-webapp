import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhitelistEntryResource {
  gymId: string;
  dni:   string;
}

@Injectable({ providedIn: 'root' })
export class WhitelistApi {
  private readonly http = inject(HttpClient);

  getWhitelist(gymId: string): Observable<WhitelistEntryResource[]> {
    return this.http.get<WhitelistEntryResource[]>(
      `${environment.apiBase}/gyms/${gymId}/whitelist`
    );
  }

  addDni(gymId: string, dni: string): Observable<WhitelistEntryResource> {
    return this.http.post<WhitelistEntryResource>(
      `${environment.apiBase}/gyms/${gymId}/whitelist`,
      { dni }
    );
  }

  removeDni(gymId: string, dni: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBase}/gyms/${gymId}/whitelist/${encodeURIComponent(dni)}`
    );
  }
}
