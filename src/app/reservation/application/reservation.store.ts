import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthStore } from '../../auth/application/auth.store';
import { EquipmentStore } from '../../gym/application/equipment.store';
import { EquipmentStatus } from '../../gym/domain/model/equipment.entity';
import { GymStateService, GymMachine } from '../../shared/application/gym-state.service';
import { AlertsService } from '../../alerts/application/alerts.service';
import { ReservationApi } from '../infrastructure/reservation-api';
import { ReservationResource } from '../infrastructure/reservation-response';

interface TrackedReservation {
  reservationId:   string;
  machineId:       string;
  equipmentId:     string;
  durationSeconds: number;
  timerStarted:    boolean;
  activatedAtMs:   number | null;
}

@Injectable({ providedIn: 'root' })
export class ReservationStore {

  private readonly api            = inject(ReservationApi);
  private readonly auth           = inject(AuthStore);
  private readonly gymState       = inject(GymStateService);
  private readonly equipmentStore = inject(EquipmentStore);
  private readonly alertsService  = inject(AlertsService);

  private readonly tracked           = signal<Map<string, TrackedReservation>>(new Map());
  private readonly historySignal     = signal<ReservationResource[]>([]);
  private readonly histLoadingSignal = signal(false);
  private readonly errorSignal       = signal<string | null>(null);
  private readonly creatingSignal    = signal(false);
  private readonly nowMs             = signal(Date.now());

  private readonly endedIds = new Set<string>();

  readonly activeReservations   = computed(() => this.historySignal().filter(r => r.status === 'ACTIVE'));
  readonly availableMachines    = this.gymState.availableMachines;
  readonly availableEquipment   = computed(() =>
    this.equipmentStore.equipment().filter(e => e.status === EquipmentStatus.AVAILABLE)
  );
  readonly expiredReservations  = this.gymState.expiredReservations;
  readonly history              = this.historySignal.asReadonly();
  readonly historyLoading       = this.histLoadingSignal.asReadonly();
  readonly reservationError     = this.errorSignal.asReadonly();
  readonly creating             = this.creatingSignal.asReadonly();
  readonly hasActiveReservation = computed(() => this.activeReservations().length > 0);

  private readonly justExpired = computed(() =>
    this.activeReservations().filter(r =>
      r.timerExpiry != null && this.timeRemainingSeconds(r.id, r.timerExpiry) === 0
    )
  );

  constructor() {
    setInterval(() => this.nowMs.set(Date.now()), 1000);

    effect(() => {
      const expired = this.justExpired();
      untracked(() => {
        expired.forEach(r => {
          if (!this.endedIds.has(r.id)) {
            this.endedIds.add(r.id);
            this.endReservation(r.id);
            this.alertsService.addReservationExpiredAlert(this.getEquipmentName(r.equipmentId));
          }
        });
      });
    });
  }

  timeRemainingSeconds(reservationId: string | null, timerExpiry: string | null | undefined): number {
    if (reservationId) {
      const entry = [...this.tracked().values()].find(v => v.reservationId === reservationId);
      if (entry?.activatedAtMs) {
        const remaining = entry.activatedAtMs + entry.durationSeconds * 1000 - this.nowMs();
        return Math.max(0, Math.floor(remaining / 1000));
      }
    }
    if (!timerExpiry) return 0;
    return Math.max(0, Math.floor((new Date(timerExpiry).getTime() - this.nowMs()) / 1000));
  }

  loadHistory(): void {
    this.histLoadingSignal.set(true);
    this.api.getAllReservations().subscribe({
      next: all => {
        this.historySignal.set(all);
        this.histLoadingSignal.set(false);
      },
      error: () => this.histLoadingSignal.set(false),
    });
  }

  createReservation(machineId: string, durationSeconds: number): void {
    this.creatingSignal.set(true);
    this.errorSignal.set(null);

    const clientId   = this.auth.currentUser()?.id ?? 0;
    const now        = new Date();
    const endDate    = new Date(now.getTime() + durationSeconds * 1000);
    const activation = new Date(now.getTime() + 5 * 60 * 1000);

    const pad          = (n: number) => String(n).padStart(2, '0');
    const toTimeString = (d: Date)   =>
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const equipmentId = this.resolveEquipmentUuid(machineId);

    this.api.initiateExpressReservation({
      clientId,
      equipmentId,
      startTime:   toTimeString(now),
      endTime:     toTimeString(endDate),
      startedAt:   now.toISOString().split('.')[0],
      timeExpiry:  activation.toISOString().split('.')[0],
    }).subscribe({
      next: res => {
        this.gymState.createReservation(machineId, durationSeconds);
        this.tracked.update(map => {
          const next = new Map(map);
          next.set(machineId, {
            reservationId:   res.id,
            machineId,
            equipmentId:     machineId,
            durationSeconds,
            timerStarted:    false,
            activatedAtMs:   null,
          });
          return next;
        });
        this.creatingSignal.set(false);
        this.loadHistory();
      },
      error: (err) => {
        const errBody   = err?.error ?? {};
        const serverMsg = ((errBody.details ?? errBody.message ?? '') as string).toLowerCase();
        const isConflict = serverMsg.includes('active reservation');
        this.errorSignal.set(
          isConflict ? 'reservation.error.alreadyActive' : 'reservation.error.generic'
        );
        this.creatingSignal.set(false);
      },
    });
  }

  clearError(): void { this.errorSignal.set(null); }

  activateReservation(reservationId: string, startTime: string, endTime: string): void {
    const entry       = [...this.tracked().values()].find(v => v.reservationId === reservationId);
    const storedSecs  = entry?.durationSeconds ?? null;
    const durationMinutes = storedSecs != null
      ? Math.max(1, Math.round(storedSecs / 60))
      : this.parseDurationMinutes(startTime, endTime);

    const activatedAtMs = Date.now();

    this.api.startTimer(reservationId, durationMinutes).subscribe({
      next: () => {
        if (entry) {
          this.gymState.activateReservation(entry.machineId);
          this.tracked.update(map => {
            const next = new Map(map);
            const cur  = next.get(entry.machineId);
            if (cur) next.set(entry.machineId, {
              ...cur,
              timerStarted:    true,
              activatedAtMs,
              durationSeconds: storedSecs ?? cur.durationSeconds,
            });
            return next;
          });
        }
        this.loadHistory();
      },
      error: () => {},
    });
  }

  cancelReservation(reservationId: string): void {
    const entry = [...this.tracked().values()].find(v => v.reservationId === reservationId);
    if (entry) {
      this.gymState.cancelReservation(entry.machineId);
      this.removeTracked(entry.machineId);
    }

    this.api.cancelReservation(reservationId).subscribe({
      next:  () => this.loadHistory(),
      error: () => this.loadHistory(),
    });
  }

  endReservation(reservationId: string): void {
    const entry = [...this.tracked().values()].find(v => v.reservationId === reservationId);
    if (entry) {
      this.gymState.cancelReservation(entry.machineId);
      this.removeTracked(entry.machineId);
    }

    this.api.endReservation(reservationId).subscribe({
      next:  () => this.loadHistory(),
      error: () => this.loadHistory(),
    });
  }

  scanAndActivate(scannedEquipmentId: string): 'activated' | 'no_reservation' {
    const reservation = this.activeReservations()
      .find(r => r.equipmentId === scannedEquipmentId && !r.timerExpiry);
    if (!reservation) return 'no_reservation';
    this.activateReservation(reservation.id, reservation.startTime, reservation.endTime);
    return 'activated';
  }

  dismissExpired(machineId: string): void {
    this.gymState.dismissExpiredReservation(machineId);
    this.removeTracked(machineId);
  }

  formatTimer(seconds: number):    string  { return this.gymState.formatTimer(seconds); }
  getZoneKey(category: string):    string  { return this.gymState.getZoneKey(category); }
  isExpired(machine: GymMachine):  boolean { return machine.timerSeconds === 0; }

  getEquipmentName(equipmentId: string): string {
    const byUuid = this.equipmentStore.equipment().find(e => e.uuid === equipmentId);
    if (byUuid) return byUuid.name;
    const byLocalId = this.gymState.machines().find(m => m.id === equipmentId);
    if (byLocalId) return byLocalId.nameKey;
    return equipmentId.length > 12 ? equipmentId.slice(0, 8) + '…' : equipmentId;
  }

  private resolveEquipmentUuid(machineId: string): string {
    return machineId; // real equipment ids are always UUIDs; anything else is a legacy mock machine id
  }

  private parseDurationMinutes(startTime: string, endTime: string): number {
    const toSecs = (t: string) => {
      const [h, m, s = 0] = t.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };
    let diff = toSecs(endTime) - toSecs(startTime);
    if (diff <= 0) diff += 24 * 3600;
    return Math.max(1, Math.ceil(diff / 60));
  }

  private removeTracked(machineId: string): void {
    this.tracked.update(map => {
      const next = new Map(map);
      next.delete(machineId);
      return next;
    });
  }
}
