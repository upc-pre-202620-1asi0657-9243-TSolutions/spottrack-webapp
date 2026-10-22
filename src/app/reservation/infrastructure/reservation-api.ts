import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReservationResource, ReservationRequestResource } from './reservation-response';

@Injectable({ providedIn: 'root' })
export class ReservationApi {
  private readonly base    = `${environment.apiBase}/reservations`;
  private readonly reqBase = `${environment.apiBase}/reservation-requests`;

  constructor(private readonly http: HttpClient) {}

  initiateExpressReservation(body: {
    clientId: number; equipmentId: string;
    startTime: string; endTime: string;
    startedAt: string; timeExpiry: string;
  }): Observable<ReservationResource> {
    return this.http.post<ReservationResource>(`${this.base}/reserve`, body);
  }

  startTimer(id: string, durationMinutes: number): Observable<ReservationResource> {
    return this.http.patch<ReservationResource>(
      `${this.base}/${id}/timer`, { durationMinutes }
    );
  }

  endReservation(id: string): Observable<ReservationResource> {
    return this.http.patch<ReservationResource>(`${this.base}/${id}/end`, {});
  }

  cancelReservation(id: string): Observable<ReservationResource> {
    return this.http.delete<ReservationResource>(`${this.base}/${id}`);
  }

  submitRequest(clientId: number, equipmentId: string): Observable<ReservationRequestResource> {
    return this.http.post<ReservationRequestResource>(this.reqBase, { clientId, equipmentId });
  }

  releaseEquipment(requestId: string): Observable<ReservationRequestResource> {
    return this.http.patch<ReservationRequestResource>(
      `${this.reqBase}/${requestId}/release`, {}
    );
  }

  getAllReservations(): Observable<ReservationResource[]> {
    return this.http.get<ReservationResource[]>(this.base);
  }

  /** Admin-only: every reservation across the gym, not just the caller's own. */
  getAllReservationsAdmin(): Observable<ReservationResource[]> {
    return this.http.get<ReservationResource[]>(`${this.base}/all`);
  }
}
