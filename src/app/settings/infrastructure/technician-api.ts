import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TechnicianResource } from './technician-response';

@Injectable({ providedIn: 'root' })
export class TechnicianApi {
  private readonly technicianUrl = `${environment.apiBase}/maintenance/technicians`;

  constructor(private readonly http: HttpClient) {}

  getTechnicians(): Observable<TechnicianResource[]> {
    return this.http.get<TechnicianResource[]>(this.technicianUrl);
  }

  createTechnician(name: string): Observable<TechnicianResource> {
    return this.http.post<TechnicianResource>(this.technicianUrl, { name });
  }
}
