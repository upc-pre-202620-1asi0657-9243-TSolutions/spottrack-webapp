import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientNotificationResource, EquipmentWatchResource } from './client-notifications-response';

@Injectable({ providedIn: 'root' })
export class ClientNotificationsApi {
  private readonly notificationsUrl = `${environment.apiBase}/notifications`;
  private readonly watchesUrl       = `${environment.apiBase}/equipment-watches`;

  constructor(private readonly http: HttpClient) {}

  getNotifications(unreadOnly: boolean): Observable<ClientNotificationResource[]> {
    const params = new HttpParams().set('unreadOnly', unreadOnly);
    return this.http.get<ClientNotificationResource[]>(this.notificationsUrl, { params });
  }

  markAsRead(notificationId: number): Observable<ClientNotificationResource> {
    return this.http.patch<ClientNotificationResource>(`${this.notificationsUrl}/${notificationId}/read`, {});
  }

  getActiveWatches(): Observable<EquipmentWatchResource[]> {
    return this.http.get<EquipmentWatchResource[]>(this.watchesUrl);
  }

  watch(equipmentId: string): Observable<EquipmentWatchResource> {
    return this.http.post<EquipmentWatchResource>(this.watchesUrl, { equipmentId });
  }

  unwatch(equipmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.watchesUrl}/${encodeURIComponent(equipmentId)}`);
  }
}
