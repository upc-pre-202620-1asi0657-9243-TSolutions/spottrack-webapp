import { computed, inject, Injectable } from '@angular/core';
import { AlertsService, AppAlert } from './alerts.service';

@Injectable({ providedIn: 'root' })
export class AlertsStore {

  private readonly service = inject(AlertsService);

  readonly alerts = this.service.alerts.asReadonly();

  readonly unreadCount = computed(() =>
    this.service.alerts().filter(a => !a.read).length
  );

  readonly adminAlerts = computed(() =>
    this.service.alerts().filter(a => a.type !== 'client')
  );

  readonly clientAlerts = computed(() =>
    this.service.alerts().filter(a => a.type === 'client')
  );

  alertsForRole(role: 'admin' | 'client'): AppAlert[] {
    return role === 'client' ? this.clientAlerts() : this.adminAlerts();
  }

  markReadForRole(role: 'admin' | 'client'): void {
    this.service.markReadForRole(role);
  }

  deleteAlert(id: string): void {
    this.service.deleteAlert(id);
  }

  clearAllForRole(role: 'admin' | 'client'): void {
    this.service.clearAllForRole(role);
  }

  addReservationExpiredAlert(nameKey: string): void {
    this.service.addReservationExpiredAlert(nameKey);
  }

  reset(): void {
    this.service.reset();
  }
}
