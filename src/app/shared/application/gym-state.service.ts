import { Injectable, signal, computed, inject } from '@angular/core';
import { AlertsService } from '../../alerts/application/alerts.service';

export type MachineStatus = 'AVAILABLE' | 'IN_USE' | 'RESERVED' | 'PENDING';
export type MachineCategory = 'CARDIO' | 'STRENGTH';

export interface GymMachine {
  id: string;
  nameKey: string;
  muscleGroupKey: string;
  status: MachineStatus;
  category: MachineCategory;
  top: string;
  left: string;
  icon: string;
  timerSeconds?: number;
  activationTimerSeconds?: number;
}

export interface ExpiredReservation {
  machineId: string;
  nameKey: string;
  icon: string;
  category: MachineCategory;
}

@Injectable({ providedIn: 'root' })
export class GymStateService {
  private alertsService = inject(AlertsService);

  machines = signal<GymMachine[]>([
    { id: '1', nameKey: 'cinta1',              muscleGroupKey: 'cardio', status: 'AVAILABLE', category: 'CARDIO',   top: '22%', left: '18%', icon: 'directions_run' },
    { id: '2', nameKey: 'prensaPiernas',       muscleGroupKey: 'legs',   status: 'AVAILABLE', category: 'STRENGTH', top: '22%', left: '48%', icon: 'fitness_center' },
    { id: '3', nameKey: 'poleaAlta',           muscleGroupKey: 'back',   status: 'AVAILABLE', category: 'STRENGTH', top: '22%', left: '76%', icon: 'fitness_center' },
    { id: '4', nameKey: 'cinta2',              muscleGroupKey: 'cardio', status: 'AVAILABLE', category: 'CARDIO',   top: '48%', left: '18%', icon: 'directions_run' },
    { id: '5', nameKey: 'rackSentadilla1',     muscleGroupKey: 'legs',   status: 'RESERVED',  category: 'STRENGTH', top: '48%', left: '48%', icon: 'fitness_center', timerSeconds: 599 },
    { id: '6', nameKey: 'remo',                muscleGroupKey: 'back',   status: 'IN_USE',    category: 'CARDIO',   top: '48%', left: '76%', icon: 'rowing' },
    { id: '7', nameKey: 'eliptica',            muscleGroupKey: 'cardio', status: 'IN_USE',    category: 'CARDIO',   top: '72%', left: '18%', icon: 'directions_bike' },
    { id: '8', nameKey: 'bancoPecho',          muscleGroupKey: 'chest',  status: 'IN_USE',    category: 'STRENGTH', top: '72%', left: '48%', icon: 'fitness_center' },
    { id: '9', nameKey: 'bancoPechoInclinado', muscleGroupKey: 'chest',  status: 'AVAILABLE', category: 'STRENGTH', top: '72%', left: '76%', icon: 'fitness_center' },
  ]);

  expiredReservations = signal<ExpiredReservation[]>([]);

  reservedMachines  = computed(() => this.machines().filter(m => m.status === 'RESERVED'));
  pendingMachines   = computed(() => this.machines().filter(m => m.status === 'PENDING'));
  availableMachines = computed(() => this.machines().filter(m => m.status === 'AVAILABLE'));

  constructor() {
    setInterval(() => {
      const expiring: ExpiredReservation[] = [];

      this.machines.update(ms =>
        ms.map(m => {
          if (m.status === 'RESERVED') {
            if (m.timerSeconds === undefined) return m;
            if (m.timerSeconds <= 1) {
              expiring.push({ machineId: m.id, nameKey: m.nameKey, icon: m.icon, category: m.category });
              return { ...m, status: 'AVAILABLE', timerSeconds: undefined };
            }
            return { ...m, timerSeconds: m.timerSeconds - 1 };
          }
          if (m.status === 'PENDING') {
            if (m.activationTimerSeconds === undefined) return m;
            if (m.activationTimerSeconds <= 1) {
              return { ...m, status: 'AVAILABLE', activationTimerSeconds: undefined, timerSeconds: undefined };
            }
            return { ...m, activationTimerSeconds: m.activationTimerSeconds - 1 };
          }
          return m;
        })
      );

      if (expiring.length > 0) {
        this.expiredReservations.update(list => [...list, ...expiring]);
      }
    }, 1000);
  }

  // durationSeconds: pass seconds directly (e.g. 10 for test, 600 for 10 min)
  // Creates a PENDING reservation — client must activate within 5 minutes
  createReservation(machineId: string, durationSeconds: number): void {
    this.machines.update(ms =>
      ms.map(m => m.id === machineId
        ? { ...m, status: 'PENDING', timerSeconds: durationSeconds, activationTimerSeconds: 300 }
        : m
      )
    );
  }

  // Client explicitly activates the reservation — starts the real timer
  activateReservation(machineId: string): void {
    this.machines.update(ms =>
      ms.map(m => m.id === machineId
        ? { ...m, status: 'RESERVED', activationTimerSeconds: undefined }
        : m
      )
    );
  }

  cancelReservation(machineId: string): void {
    this.machines.update(ms =>
      ms.map(m => m.id === machineId
        ? { ...m, status: 'AVAILABLE', timerSeconds: undefined, activationTimerSeconds: undefined }
        : m
      )
    );
  }

  dismissExpiredReservation(machineId: string): void {
    this.expiredReservations.update(list => list.filter(r => r.machineId !== machineId));
  }

  formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getZoneKey(category: string): string {
    return category === 'STRENGTH' ? 'fuerza' : 'cardio';
  }
}
