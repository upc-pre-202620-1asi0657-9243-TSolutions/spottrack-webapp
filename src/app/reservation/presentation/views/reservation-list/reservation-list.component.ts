import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationStore } from '../../../application/reservation.store';
import { ReservationResource } from '../../../infrastructure/reservation-response';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';
import { QrScannerComponent } from '../../../../shared/presentation/components/qr-scanner/qr-scanner.component';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

export type HistoryFilter = 'ALL' | 'ACTIVE' | 'ENDED' | 'CANCELLED' | 'EXPIRED';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    TranslateModule,
    ContextMenuDirective,
    QrScannerComponent,
    PaginatorComponent,
    RouterLink,
  ],
  templateUrl: './reservation-list.component.html',
  styleUrl: './reservation-list.component.css',
})
export class ReservationListComponent implements OnInit {
  readonly store = inject(ReservationStore);

  readonly activeReservations   = this.store.activeReservations;
  readonly availableEquipment   = this.store.availableEquipment;
  readonly expiredReservations  = this.store.expiredReservations;
  readonly history              = this.store.history;
  readonly historyLoading       = this.store.historyLoading;
  readonly reservationError     = this.store.reservationError;
  readonly creating             = this.store.creating;
  readonly hasActiveReservation = this.store.hasActiveReservation;

  // ── History table ─────────────────────────────────────────────────────────
  readonly historyFilters: HistoryFilter[] = ['ALL', 'ACTIVE', 'ENDED', 'CANCELLED', 'EXPIRED'];
  readonly historyFilter   = signal<HistoryFilter>('ALL');
  readonly historyPage     = signal(0);
  readonly historyPageSize = signal(5);

  readonly sortedHistory = computed(() =>
    [...this.history()].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
  );

  readonly filteredHistory = computed(() => {
    const f = this.historyFilter();
    return f === 'ALL' ? this.sortedHistory() : this.sortedHistory().filter(r => r.status === f);
  });

  readonly pagedHistory = computed(() =>
    paginate(this.filteredHistory(), this.historyPage(), this.historyPageSize())
  );

  readonly statusCount = computed(() => {
    const counts: Record<HistoryFilter, number> = { ALL: 0, ACTIVE: 0, ENDED: 0, CANCELLED: 0, EXPIRED: 0 };
    for (const r of this.history()) {
      counts.ALL++;
      if (r.status in counts) counts[r.status as HistoryFilter]++;
    }
    return counts;
  });

  /** Machines the empty state offers as one-click shortcuts into the booking modal. */
  readonly quickPicks = computed(() => this.availableEquipment().slice(0, 6));

  readonly steps = [
    { icon: 'event_available', key: 'item1' },
    { icon: 'qr_code_scanner', key: 'item2' },
    { icon: 'timer',           key: 'item3' },
    { icon: 'event_busy',      key: 'item4' },
  ];

  durations = [
    { seconds: 10,        labelKey: 'reservation.modal.option10s' },
    { seconds: 10 * 60,   labelKey: 'reservation.modal.option10m' },
    { seconds: 15 * 60,   labelKey: 'reservation.modal.option15m' },
    { seconds: 20 * 60,   labelKey: 'reservation.modal.option20m' },
  ];

  readonly showModal              = signal(false);
  readonly showScanner            = signal(false);
  readonly scanFeedback           = signal<{ ok: boolean; msgKey: string } | null>(null);
  selectedMachineId: string | null = null;
  selectedDurationSeconds          = 15 * 60;

  private pendingModalClose = false;

  constructor() {
    effect(() => {
      if (this.pendingModalClose && !this.creating()) {
        this.pendingModalClose = false;
        if (!this.reservationError()) {
          this.showModal.set(false);
        }
      }
    }, { allowSignalWrites: true });

    // A new filter starts on the first page.
    effect(() => { this.historyFilter(); this.historyPage.set(0); }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.store.loadHistory();
  }

  cancelReservation(reservationId: string): void { this.store.cancelReservation(reservationId); }
  dismissExpired(machineId: string):        void { this.store.dismissExpired(machineId); }
  formatTimer(seconds: number):             string { return this.store.formatTimer(seconds); }
  getZoneKey(category: string):             string { return this.store.getZoneKey(category); }
  equipmentName(equipmentId: string):       string { return this.store.getEquipmentName(equipmentId); }

  timeRemaining(reservationId: string, timerExpiry: string | null | undefined): number {
    return this.store.timeRemainingSeconds(reservationId, timerExpiry);
  }

  /** Booked length from the HH:mm:ss window; a window past midnight wraps around. */
  durationSeconds(r: ReservationResource): number {
    const toSecs = (t: string) => {
      const [h = 0, m = 0, s = 0] = (t ?? '').split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };
    let diff = toSecs(r.endTime) - toSecs(r.startTime);
    if (diff <= 0) diff += 24 * 3600;
    return diff;
  }

  remainingPct(r: ReservationResource): number {
    const total = this.durationSeconds(r);
    return total ? Math.min(100, (this.timeRemaining(r.id, r.timerExpiry) / total) * 100) : 0;
  }

  openScanner(): void  { this.scanFeedback.set(null); this.showScanner.set(true); }
  closeScanner(): void { this.showScanner.set(false); }

  onQrScanned(uuid: string): void {
    this.showScanner.set(false);
    const result = this.store.scanAndActivate(uuid);
    this.scanFeedback.set(result === 'activated'
      ? { ok: true,  msgKey: 'reservation.scan.ok' }
      : { ok: false, msgKey: 'reservation.scan.noReservation' });
    setTimeout(() => this.scanFeedback.set(null), 4000);
  }

  openModal(machineId: string | null = null): void {
    this.selectedMachineId = machineId;
    this.selectedDurationSeconds = 15 * 60;
    this.store.clearError();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.store.clearError();
    this.showModal.set(false);
  }

  createReservation(): void {
    if (!this.selectedMachineId) return;
    this.pendingModalClose = true;
    this.store.createReservation(this.selectedMachineId, this.selectedDurationSeconds);
  }

  refreshHistory(): void {
    this.historyPage.set(0);
    this.store.loadHistory();
  }

  reservationMenu(reservationId: string): ContextMenuItem[] {
    return [
      { label: 'Cancel reservation', icon: 'cancel', action: () => this.cancelReservation(reservationId) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'New reservation',    icon: 'add',    action: () => this.openModal() },
    ];
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  trimTime(t: string): string {
    return t ? t.slice(0, 5) : '—';
  }
}
