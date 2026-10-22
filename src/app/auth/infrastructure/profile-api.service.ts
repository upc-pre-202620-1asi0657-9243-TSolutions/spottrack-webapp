import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UpdatePersonInfoRequest {
  firstName:   string;
  lastName:    string;
  phoneNumber: string;
  dni:         string;
}

export interface ProfileSummary {
  id:          number;
  fullName:    string;
  email:       string;
  phoneNumber: string | null;
  firstName:   string | null;
  lastName:    string | null;
  dni:         string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly base = `${environment.apiBase}/profiles`;

  constructor(private readonly http: HttpClient) {}

  getMyClientProfile(): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.base}/clients/me`);
  }

  getMyAdminProfile(): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.base}/admins/me`);
  }

  updateClientProfile(body: UpdatePersonInfoRequest): Observable<ProfileSummary> {
    return this.http.put<ProfileSummary>(`${this.base}/clients/me`, body);
  }

  updateAdminProfile(body: UpdatePersonInfoRequest): Observable<ProfileSummary> {
    return this.http.put<ProfileSummary>(`${this.base}/admins/me`, body);
  }
}
