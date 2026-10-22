import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class PasswordApi {
  private readonly http = inject(HttpClient);

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${BASE}/users/me/password`, { currentPassword, newPassword });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${BASE}/authentication/forgot-password`, { email });
  }

  forgotPasswordVerify(email: string, dni: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${BASE}/authentication/forgot-password/verify`, { email, dni, newPassword });
  }
}
