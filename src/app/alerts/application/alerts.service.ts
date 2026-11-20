import { Injectable, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AlertsApi } from '../infrastructure/alerts-api';
import { AlertResource } from '../infrastructure/alerts-response';
import { ClientNotificationsApi } from '../../notifications/infrastructure/client-notifications-api';

export interface AppAlert {
  id: string;
  backendId?: number;       // present only for alerts sourced from the backend
  clientNotificationId?: number; // present only for client notifications sourced from the backend
  equipmentId?: string;
  severity?: 'WARNING' | 'CRITICAL'; // present only for alerts sourced from the backend
  title?: string;           // plain text (for dynamically generated alerts)
  titleKey?: string;        // i18n key (for seeded/static alerts)
  description?: string;
  descriptionKey?: string;
  type: 'admin' | 'client' | 'system';
  icon: string;
  date: Date;
  targetRoute: string;
  targetQuery?: Record<string, string>; // narrows the target page, e.g. to the equipment's ticket
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private translate = inject(TranslateService);
  private api        = inject(AlertsApi);
  private notificationsApi = inject(ClientNotificationsApi);

  alerts = signal<AppAlert[]>([]);

  constructor() {
    this.loadBackendAlerts();
  }

  private loadBackendAlerts(): void {
    this.api.getAlerts().subscribe({
      next: resources => {
        const mapped = resources.map(r => this.toAppAlert(r));
        this.alerts.update(list => [...mapped, ...list]);
      },
      error: () => { /* alert bell stays local-only if the backend call fails */ },
    });
  }

  private toAppAlert(r: AlertResource): AppAlert {
    const isWarning = r.severity === 'WARNING';
    return {
      id:          `BE-${r.id}`,
      backendId:   r.id,
      severity:    r.severity,
      titleKey:    isWarning ? 'alerts.backend.maintenanceThreshold.title' : 'alerts.backend.anomalyReported.title',
      description: r.message,
      type:        'admin',
      icon:        isWarning ? 'build' : 'report_problem',
      date:        new Date(r.createdAt),
      targetRoute: '/maintenance',
      targetQuery: { equipment: r.equipmentId },
      read:        r.isResolved,
    };
  }

  // Called when a reservation timer expires. `machineName` is the equipment's
  // real display name — not a `machines.names.*` translation key, since real
  // equipment names come straight from the database, already human-readable.
  addReservationExpiredAlert(machineName: string): void {
    this.alerts.update(list => [
      {
        id:          `RES-EXP-${Date.now()}`,
        title:       this.translate.instant('clientAlerts.reservationExpired.title',       { machine: machineName }),
        description: this.translate.instant('clientAlerts.reservationExpired.description', { machine: machineName }),
        type:        'client',
        icon:        'event_busy',
        date:        new Date(),
        targetRoute: '/bookings',
        read:        false,
      },
      ...list,
    ]);
  }

  /**
   * Adds client notifications coming from the backend (initial load or real-time push).
   * Notifications already in the inbox are kept as they are, so local read state isn't lost.
   */
  addClientNotifications(incoming: AppAlert[]): void {
    this.alerts.update(list => {
      const known = new Set(list.map(a => a.id));
      const fresh = incoming.filter(a => !known.has(a.id));
      return [...fresh, ...list].sort((a, b) => b.date.getTime() - a.date.getTime());
    });
  }

  deleteAlert(id: string): void {
    const alert = this.alerts().find(a => a.id === id);
    if (alert?.backendId) {
      this.api.resolveAlert(alert.backendId).subscribe();
    }
    if (alert) this.syncClientNotificationRead(alert);
    this.alerts.update(list => list.filter(a => a.id !== id));
  }

  /** Resolves every backend-sourced alert belonging to the given role, then clears them from the inbox. */
  clearAllForRole(role: 'admin' | 'client'): void {
    const toClear = this.alerts().filter(a => role === 'client' ? a.type === 'client' : a.type !== 'client');
    for (const alert of toClear) {
      if (alert.backendId) this.api.resolveAlert(alert.backendId).subscribe();
      this.syncClientNotificationRead(alert);
    }
    this.alerts.update(list => list.filter(a => !toClear.includes(a)));
  }

  /** Marks one alert read, e.g. when it is opened in the inbox reading pane. */
  markRead(id: string): void {
    const alert = this.alerts().find(a => a.id === id);
    if (alert) this.syncClientNotificationRead(alert);
    this.alerts.update(list => list.map(a => a.id === id && !a.read ? { ...a, read: true } : a));
  }

  /** Flags an alert as unread again, e.g. to come back to it later. */
  markUnread(id: string): void {
    this.alerts.update(list => list.map(a => a.id === id && a.read ? { ...a, read: false } : a));
  }

  // Only marks alerts that belong to the given role as read
  markReadForRole(role: 'admin' | 'client'): void {
    if (role === 'client') {
      this.alerts().filter(a => a.type === 'client').forEach(a => this.syncClientNotificationRead(a));
    }
    this.alerts.update(list =>
      list.map(a => {
        if (role === 'client' && a.type !== 'client') return a;
        return { ...a, read: true };
      })
    );
  }

  /** A client notification read (or removed) in the inbox is marked read in the backend too. */
  private syncClientNotificationRead(alert: AppAlert): void {
    if (alert.clientNotificationId && !alert.read) {
      this.notificationsApi.markAsRead(alert.clientNotificationId).subscribe({ error: () => {} });
    }
  }

  /** Called by AuthStore on logout to prevent stale alert data from bleeding into the next session. */
  reset(): void {
    this.alerts.set([]);
  }
}
