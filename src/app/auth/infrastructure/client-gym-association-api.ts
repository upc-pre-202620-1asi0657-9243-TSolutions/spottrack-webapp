import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientGymAssociationResource {
  clientId: number;
  gymId:    string;
  active:   boolean;
}

@Injectable({ providedIn: 'root' })
export class ClientGymAssociationApi {
  private readonly base = `${environment.apiBase}/profiles/clients/me`;
  private readonly http = inject(HttpClient);

  getAssociations(): Observable<ClientGymAssociationResource[]> {
    return this.http.get<ClientGymAssociationResource[]>(`${this.base}/gym-associations`);
  }

  associateGym(gymId: string): Observable<ClientGymAssociationResource> {
    return this.http.post<ClientGymAssociationResource>(`${this.base}/gym-associations`, { gymId });
  }

  changeActiveGym(gymId: string): Observable<ClientGymAssociationResource> {
    return this.http.patch<ClientGymAssociationResource>(`${this.base}/active-gym`, { gymId });
  }
}
