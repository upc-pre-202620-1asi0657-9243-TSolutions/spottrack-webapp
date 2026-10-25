import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MonitoringStore } from '../../../application/monitoring.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { ReservationApi } from '../../../../reservation/infrastructure/reservation-api';
import { ReservationResource } from '../../../../reservation/infrastructure/reservation-response';
import { AuthStore } from '../../../../auth/application/auth.store';

interface IssueCategory {
  key:  string;
  icon: string;
}

/** Reservations shown before "show all"; recent ones are the likely culprits. */
const RECENT_LIMIT = 4;
export const DESCRIPTION_MAX = 500;

@Component({
  selector: 'app-anomaly-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    MatIconModule,
  ],
  templateUrl: './anomaly-report.html',
  styleUrl: './anomaly-report.scss',
})
export class AnomalyReportComponent implements OnInit {
  private readonly router         = inject(Router);
  private readonly reservationApi = inject(ReservationApi);
  private readonly authStore      = inject(AuthStore);
  private readonly translate      = inject(TranslateService);
  readonly store           = inject(MonitoringStore);
  readonly equipmentStore  = inject(EquipmentStore);

  // The store's loading/error slots are shared by every monitoring call (sensor
  // lists, cameras…); this page only reflects its own submit.
  private readonly storeLoading = this.store.actionLoading;
  private readonly storeError   = this.store.actionError;
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);
  readonly anomalyReports = this.store.anomalyReports;
  readonly equipment      = this.equipmentStore.equipment;

  readonly isAdmin = this.authStore.isAdmin;

  readonly descriptionMax = DESCRIPTION_MAX;

  readonly categories: IssueCategory[] = [
    { key: 'broken',  icon: 'build' },
    { key: 'noise',   icon: 'volume_up' },
    { key: 'sensor',  icon: 'sensors_off' },
    { key: 'hygiene', icon: 'cleaning_services' },
    { key: 'safety',  icon: 'health_and_safety' },
    { key: 'other',   icon: 'more_horiz' },
  ];

  readonly reservations        = signal<ReservationResource[]>([]);
  readonly reservationsLoading = signal(false);
  readonly showAll             = signal(false);

  readonly reservationId = signal<string | null>(null);
  readonly category      = signal<string | null>(null);
  readonly description   = signal('');
  readonly submitted     = signal(false);


  readonly sortedReservations = computed(() =>
    [...this.reservations()].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
  );

  readonly visibleReservations = computed(() =>
    this.showAll() ? this.sortedReservations() : this.sortedReservations().slice(0, RECENT_LIMIT)
  );

  readonly hiddenCount = computed(() => Math.max(0, this.sortedReservations().length - RECENT_LIMIT));

  readonly selectedReservation = computed(() =>
    this.reservations().find(r => r.id === this.reservationId()) ?? null
  );

  readonly isValid = computed(() =>
    !!this.selectedReservation() && !!this.category() && this.description().trim().length > 0
  );

  constructor() {
    // The store has no success signal: a submit that settles without an error landed.
    effect(() => {
      if (this.loading() && !this.storeLoading()) {
        const error = this.storeError();
        this.loading.set(false);
        this.error.set(error);
        if (!error) {
          this.reset();
          this.submitted.set(true);
          setTimeout(() => this.submitted.set(false), 5000);
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.reservationsLoading.set(true);
    const source$ = this.isAdmin()
      ? this.reservationApi.getAllReservationsAdmin()
      : this.reservationApi.getAllReservations();
    source$.subscribe({
      next: reservations => {
        this.reservations.set(reservations);
        this.reservationsLoading.set(false);
      },
      error: () => this.reservationsLoading.set(false),
    });
  }

  selectReservation(id: string): void {
    this.reservationId.set(id);
    this.submitted.set(false);
  }

  submit(): void {
    const reservation = this.selectedReservation();
    const category    = this.category();
    if (!this.isValid() || !reservation || !category) return;

    const zoneId = this.equipment().find(e => e.uuid === reservation.equipmentId)?.zoneId ?? '';
    // The API takes free text only, so the category travels as a prefix admins can scan for.
    const label  = this.translate.instant(`monitoring.anomalyReport.category.${category}`);

    this.loading.set(true);
    this.error.set(null);
    this.store.reportAnomaly({
      reservationId: reservation.id,
      equipmentId: reservation.equipmentId,
      zoneId,
      anomalyDescription: `[${label}] ${this.description().trim()}`,
    });
  }

  reset(): void {
    this.reservationId.set(null);
    this.category.set(null);
    this.description.set('');
  }

  equipmentName(uuid: string): string {
    return this.equipment().find(e => e.uuid === uuid)?.name ?? uuid;
  }

  trimTime(t: string): string {
    return t ? t.slice(0, 5) : '—';
  }

  back(): void {
    this.router.navigate([this.isAdmin() ? '/monitoring' : '/bookings']);
  }
}
