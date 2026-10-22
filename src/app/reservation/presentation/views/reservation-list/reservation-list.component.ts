import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationStore } from '../../../application/reservation.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';
import { QrScannerComponent } from '../../../../shared/presentation/components/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    TranslateModule,
    ContextMenuDirective,
    QrScannerComponent,
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

  readonly pageSize  = 5;
  readonly pageIndex = signal(0);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.history().length / this.pageSize))
  );

  readonly paginatedHistory = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.history().slice(start, start + this.pageSize);
  });

  durations = [
    { seconds: 10,        labelKey: 'reservation.modal.option10s' },
    { seconds: 10 * 60,   labelKey: 'reservation.modal.option10m' },
    { seconds: 15 * 60,   labelKey: 'reservation.modal.option15m' },
    { seconds: 20 * 60,   labelKey: 'reservation.modal.option20m' },
  ];

  readonly showModal              = signal(false);
  readonly showScanner            = signal(false);
  readonly scanFeedback           = signal<{ ok: boolean; msg: string } | null>(null);
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

  openScanner(): void  { this.scanFeedback.set(null); this.showScanner.set(true); }
  closeScanner(): void { this.showScanner.set(false); }

  onQrScanned(uuid: string): void {
    this.showScanner.set(false);
    const result = this.store.scanAndActivate(uuid);
    if (result === 'activated') {
      this.scanFeedback.set({ ok: true,  msg: '¡Check-in confirmado! Tu reserva está activa.' });
    } else {
      this.scanFeedback.set({ ok: false, msg: 'No tienes una reserva pendiente para esa máquina.' });
    }
    setTimeout(() => this.scanFeedback.set(null), 4000);
  }

  openModal(): void {
    this.selectedMachineId = null;
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

  prevPage(): void { this.pageIndex.update(i => Math.max(0, i - 1)); }
  nextPage(): void { this.pageIndex.update(i => Math.min(this.totalPages() - 1, i + 1)); }

  refreshHistory(): void {
    this.pageIndex.set(0);
    this.store.loadHistory();
  }

  reservationMenu(reservationId: string): ContextMenuItem[] {
    return [
      { label: 'Cancel reservation', icon: 'cancel', action: () => this.cancelReservation(reservationId) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'New reservation',    icon: 'add',    action: () => this.openModal() },
    ];
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':    return 'status-active';
      case 'EXPIRED':   return 'status-expired';
      case 'CANCELLED': return 'status-cancelled';
      case 'ENDED':     return 'status-ended';
      default:          return '';
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  trimTime(t: string): string {
    return t ? t.slice(0, 8) : '—';
  }
}
