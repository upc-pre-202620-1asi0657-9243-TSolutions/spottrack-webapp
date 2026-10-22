import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MonitoringStore } from '../../../application/monitoring.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { ReservationApi } from '../../../../reservation/infrastructure/reservation-api';
import { ReservationResource } from '../../../../reservation/infrastructure/reservation-response';
import { AuthStore } from '../../../../auth/application/auth.store';

interface AnomalyForm {
  reservationId: string | null;
  anomalyDescription: string;
}

@Component({
  selector: 'app-anomaly-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './anomaly-report.html',
  styleUrl: './anomaly-report.scss',
})
export class AnomalyReportComponent implements OnInit {
  private readonly router         = inject(Router);
  private readonly reservationApi = inject(ReservationApi);
  private readonly authStore      = inject(AuthStore);
  readonly store           = inject(MonitoringStore);
  readonly equipmentStore  = inject(EquipmentStore);

  readonly loading        = this.store.actionLoading;
  readonly error          = this.store.actionError;
  readonly anomalyReports = this.store.anomalyReports;
  readonly equipment      = this.equipmentStore.equipment;

  readonly isAdmin = this.authStore.isAdmin;

  reservations: ReservationResource[] = [];
  reservationsLoading = false;

  form: AnomalyForm = {
    reservationId: null,
    anomalyDescription: '',
  };

  ngOnInit(): void {
    this.reservationsLoading = true;
    const source$ = this.isAdmin()
      ? this.reservationApi.getAllReservationsAdmin()
      : this.reservationApi.getAllReservations();
    source$.subscribe({
      next: reservations => {
        this.reservations = reservations;
        this.reservationsLoading = false;
      },
      error: () => { this.reservationsLoading = false; },
    });
  }

  get selectedReservation(): ReservationResource | null {
    return this.reservations.find(r => r.id === this.form.reservationId) ?? null;
  }

  get isValid(): boolean {
    return !!(this.form.reservationId && this.form.anomalyDescription.trim());
  }

  submit(): void {
    const reservation = this.selectedReservation;
    if (!this.isValid || !reservation) return;

    const zoneId = this.equipment().find(e => e.uuid === reservation.equipmentId)?.zoneId ?? '';

    this.store.reportAnomaly({
      reservationId: reservation.id,
      equipmentId: reservation.equipmentId,
      zoneId,
      anomalyDescription: this.form.anomalyDescription.trim(),
    });
    this.form = { reservationId: null, anomalyDescription: '' };
  }

  equipmentName(uuid: string): string {
    return this.equipment().find(e => e.uuid === uuid)?.name ?? uuid;
  }

  reservationLabel(r: ReservationResource): string {
    return `${this.equipmentName(r.equipmentId)} · ${r.startTime}-${r.endTime}`;
  }

  back(): void {
    this.router.navigate([this.isAdmin() ? '/monitoring' : '/map']);
  }
}
