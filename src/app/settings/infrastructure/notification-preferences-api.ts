import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationPreferencesResource } from './notification-preferences-response';

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesApi {
  private readonly usersUrl = `${environment.apiBase}/users`;

  constructor(private readonly http: HttpClient) {}

  getCurrentUser(): Observable<NotificationPreferencesResource> {
    return this.http.get<NotificationPreferencesResource>(`${this.usersUrl}/me`);
  }

  updatePreferences(resource: NotificationPreferencesResource): Observable<NotificationPreferencesResource> {
    return this.http.patch<NotificationPreferencesResource>(`${this.usersUrl}/me/notification-preferences`, resource);
  }
}
