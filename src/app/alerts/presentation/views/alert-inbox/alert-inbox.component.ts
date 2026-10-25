import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertsStore } from '../../../application/alerts.store';
import { AppAlert } from '../../../application/alerts.service';
import { AuthStore } from '../../../../auth/application/auth.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';
import { AlertTone, alertTone } from '../../alert-tone';

export type ToneFilter = 'all' | AlertTone;

interface AlertGroup {
  key:    'today' | 'yesterday' | 'earlier';
  alerts: AppAlert[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-alert-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, ContextMenuDirective],
  templateUrl: './alert-inbox.component.html',
  styleUrl: './alert-inbox.component.scss',
})
export class AlertInboxComponent implements OnInit {
  private router      = inject(Router);
  private translate   = inject(TranslateService);
  private authStore   = inject(AuthStore);
  readonly store      = inject(AlertsStore);

  readonly filters: ToneFilter[] = ['all', 'critical', 'warning', 'info'];
  readonly filter = signal<ToneFilter>('all');
  readonly search = signal('');
  readonly confirmClear = signal(false);

  /** Alerts that were unread when the page opened keep a "new" dot for this visit. */
  readonly newIds = signal<Set<string>>(new Set());

  readonly isAdmin = computed(() => !this.authStore.isClient());

  private get currentRole(): 'admin' | 'client' {
    return this.authStore.isClient() ? 'client' : 'admin';
  }

  readonly alertsList = computed(() =>
    [...this.store.alertsForRole(this.currentRole)].sort((a, b) => b.date.getTime() - a.date.getTime())
  );

  readonly counts = computed<Record<ToneFilter, number>>(() => {
    const list = this.alertsList();
    return {
      all:      list.length,
      critical: list.filter(a => alertTone(a) === 'critical').length,
      warning:  list.filter(a => alertTone(a) === 'warning').length,
      info:     list.filter(a => alertTone(a) === 'info').length,
    };
  });

  readonly visibleAlerts = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.alertsList().filter(a =>
      (f === 'all' || alertTone(a) === f) &&
      (!q || `${this.resolveTitle(a)} ${this.resolveDescription(a)}`.toLowerCase().includes(q))
    );
  });

  readonly groups = computed<AlertGroup[]>(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = startOfToday.getTime();
    const buckets: AlertGroup[] = [
      { key: 'today', alerts: [] },
      { key: 'yesterday', alerts: [] },
      { key: 'earlier', alerts: [] },
    ];
    for (const a of this.visibleAlerts()) {
      const t = a.date.getTime();
      buckets[t >= today ? 0 : t >= today - DAY_MS ? 1 : 2].alerts.push(a);
    }
    return buckets.filter(b => b.alerts.length);
  });

  ngOnInit(): void {
    this.newIds.set(new Set(this.alertsList().filter(a => !a.read).map(a => a.id)));
    this.store.markReadForRole(this.currentRole);
  }

  tone(alert: AppAlert): AlertTone { return alertTone(alert); }

  openAlert(alert: AppAlert): void {
    this.router.navigate(['/alerts', alert.id]);
  }

  goToTarget(event: Event, alert: AppAlert): void {
    event.stopPropagation();
    if (alert.targetRoute) this.router.navigate([alert.targetRoute]);
  }

  deleteAlert(event: Event, id: string): void {
    event.stopPropagation();
    this.store.deleteAlert(id);
  }

  clearAll(): void {
    this.store.clearAllForRole(this.currentRole);
    this.confirmClear.set(false);
  }

  resolveTitle(alert: AppAlert): string {
    return alert.titleKey ? this.translate.instant(alert.titleKey) : (alert.title ?? '');
  }

  resolveDescription(alert: AppAlert): string {
    return alert.descriptionKey ? this.translate.instant(alert.descriptionKey) : (alert.description ?? '');
  }

  alertMenu(alert: AppAlert): ContextMenuItem[] {
    return [
      { label: 'View details', icon: 'open_in_new',  action: () => this.openAlert(alert) },
      { label: 'Delete',       icon: 'delete',        action: () => this.store.deleteAlert(alert.id) },
    ];
  }

  getRelativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return this.translate.instant('alerts.time.moment');
    const m = Math.floor(diff / 60);
    if (m < 60) return this.translate.instant(m === 1 ? 'alerts.time.minute' : 'alerts.time.minutes', { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return this.translate.instant(h === 1 ? 'alerts.time.hour' : 'alerts.time.hours', { count: h });
    const d = Math.floor(h / 24);
    return this.translate.instant(d === 1 ? 'alerts.time.day' : 'alerts.time.days', { count: d });
  }
}
