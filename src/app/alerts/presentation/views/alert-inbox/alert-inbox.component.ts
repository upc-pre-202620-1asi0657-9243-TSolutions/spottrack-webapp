import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { AlertReaderComponent } from '../../components/alert-reader/alert-reader';

export type AlertFolder = 'all' | 'unread' | AlertTone;
export type AlertSort = 'newest' | 'oldest';
export type DatePreset = 'any' | 'today' | 'week' | 'month' | 'custom';

interface AlertGroup {
  key:    'today' | 'yesterday' | 'week' | 'earlier';
  alerts: AppAlert[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Below this width the reading pane is hidden and alerts open on their own page. */
const SPLIT_MIN_WIDTH = 900;

/**
 * Mail-client style inbox: folders on the left, the alert list in the middle
 * and a reading pane on the right. Opening an alert marks it read.
 */
@Component({
  selector: 'app-alert-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, ContextMenuDirective, AlertReaderComponent],
  templateUrl: './alert-inbox.component.html',
  styleUrl: './alert-inbox.component.scss',
})
export class AlertInboxComponent {
  private router      = inject(Router);
  private translate   = inject(TranslateService);
  private authStore   = inject(AuthStore);
  readonly store      = inject(AlertsStore);

  readonly folders: { key: AlertFolder; icon: string }[] = [
    { key: 'all',      icon: 'inbox' },
    { key: 'unread',   icon: 'mark_email_unread' },
    { key: 'critical', icon: 'error' },
    { key: 'warning',  icon: 'warning' },
    { key: 'info',     icon: 'info' },
  ];

  readonly folder = signal<AlertFolder>('all');
  readonly search = signal('');
  readonly sort   = signal<AlertSort>('newest');
  readonly selectedId   = signal<string | null>(null);
  readonly collapsed    = signal<Set<string>>(new Set());
  readonly confirmClear = signal(false);

  // ── Date & hour filters ───────────────────────────────────────────────────
  readonly datePresets: DatePreset[] = ['any', 'today', 'week', 'month', 'custom'];
  readonly hours = Array.from({ length: 24 }, (_, h) => h);
  readonly showFilters = signal(false);
  readonly datePreset  = signal<DatePreset>('any');
  readonly dateFrom    = signal('');   // yyyy-MM-dd, custom range only
  readonly dateTo      = signal('');
  readonly hourFrom    = signal<number | null>(null);
  readonly hourTo      = signal<number | null>(null);

  readonly activeFilterCount = computed(() =>
    (this.datePreset() !== 'any' ? 1 : 0) + (this.hourFrom() !== null || this.hourTo() !== null ? 1 : 0)
  );

  readonly isAdmin = computed(() => !this.authStore.isClient());

  private get currentRole(): 'admin' | 'client' {
    return this.authStore.isClient() ? 'client' : 'admin';
  }

  readonly alertsList = computed(() => this.store.alertsForRole(this.currentRole));

  readonly counts = computed<Record<AlertFolder, number>>(() => {
    const list = this.alertsList();
    return {
      all:      list.length,
      unread:   list.filter(a => !a.read).length,
      critical: list.filter(a => alertTone(a) === 'critical').length,
      warning:  list.filter(a => alertTone(a) === 'warning').length,
      info:     list.filter(a => alertTone(a) === 'info').length,
    };
  });

  readonly visibleAlerts = computed(() => {
    const f = this.folder();
    const q = this.search().trim().toLowerCase();
    const dir = this.sort() === 'newest' ? -1 : 1;
    return this.alertsList()
      .filter(a =>
        (f === 'all' || (f === 'unread' ? !a.read : alertTone(a) === f)) &&
        (!q || `${this.resolveTitle(a)} ${this.resolveDescription(a)}`.toLowerCase().includes(q)) &&
        this.matchesDate(a.date) && this.matchesHour(a.date)
      )
      .sort((a, b) => dir * (a.date.getTime() - b.date.getTime()));
  });

  readonly groups = computed<AlertGroup[]>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = start.getTime();
    const buckets: AlertGroup[] = [
      { key: 'today', alerts: [] },
      { key: 'yesterday', alerts: [] },
      { key: 'week', alerts: [] },
      { key: 'earlier', alerts: [] },
    ];
    for (const a of this.visibleAlerts()) {
      const t = a.date.getTime();
      const i = t >= today ? 0 : t >= today - DAY_MS ? 1 : t >= today - 6 * DAY_MS ? 2 : 3;
      buckets[i].alerts.push(a);
    }
    const groups = buckets.filter(b => b.alerts.length);
    return this.sort() === 'newest' ? groups : groups.reverse();
  });

  readonly selected = computed(() => this.alertsList().find(a => a.id === this.selectedId()) ?? null);

  constructor() {
    // A deleted or filtered-out alert leaves the reading pane empty.
    effect(() => {
      const id = this.selectedId();
      if (id && !this.alertsList().some(a => a.id === id)) this.selectedId.set(null);
    }, { allowSignalWrites: true });
  }

  tone(alert: AppAlert): AlertTone { return alertTone(alert); }

  hourLabel(h: number): string { return `${String(h).padStart(2, '0')}:00`; }
  hourEndLabel(h: number): string { return `${String(h).padStart(2, '0')}:59`; }

  clearFilters(): void {
    this.datePreset.set('any');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.hourFrom.set(null);
    this.hourTo.set(null);
  }

  private matchesDate(date: Date): boolean {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t = date.getTime();
    switch (this.datePreset()) {
      case 'today': return t >= start.getTime();
      case 'week':  return t >= start.getTime() - 6 * DAY_MS;
      case 'month': return t >= start.getTime() - 29 * DAY_MS;
      case 'custom': {
        // Local-day bounds; either end may be left open.
        const from = this.dateFrom() ? new Date(`${this.dateFrom()}T00:00:00`).getTime() : -Infinity;
        const to   = this.dateTo()   ? new Date(`${this.dateTo()}T23:59:59.999`).getTime() : Infinity;
        return t >= from && t <= to;
      }
      default: return true;
    }
  }

  /** Hour window [from, to] inclusive; from > to means an overnight window such as 22:00–06:00. */
  private matchesHour(date: Date): boolean {
    const from = this.hourFrom();
    const to = this.hourTo();
    if (from === null && to === null) return true;
    const h = date.getHours();
    const lo = from ?? 0;
    const hi = to ?? 23;
    return lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi;
  }

  select(alert: AppAlert): void {
    this.store.markRead(alert.id);
    if (window.innerWidth < SPLIT_MIN_WIDTH) {
      this.router.navigate(['/alerts', alert.id]);
      return;
    }
    this.selectedId.set(alert.id);
  }

  /** Arrow keys walk the visible list, like a mail client. */
  step(event: Event, delta: number): void {
    event.preventDefault();
    const list = this.groups().flatMap(g => this.isCollapsed(g.key) ? [] : g.alerts);
    if (!list.length) return;
    const i = list.findIndex(a => a.id === this.selectedId());
    const next = list[Math.min(list.length - 1, Math.max(0, i + delta))] ?? list[0];
    this.select(next);
    document.getElementById(`alert-${next.id}`)?.focus();
  }

  toggleGroup(key: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isCollapsed(key: string): boolean { return this.collapsed().has(key); }

  markAllRead(): void { this.store.markReadForRole(this.currentRole); }

  deleteAlert(alert: AppAlert): void { this.store.deleteAlert(alert.id); }

  deleteSelected(): void {
    const a = this.selected();
    if (a) this.deleteAlert(a);
  }

  openTarget(alert: AppAlert): void {
    if (alert.targetRoute) this.router.navigate([alert.targetRoute], { queryParams: alert.targetQuery });
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

  /** Time for today, weekday within the week, short date beyond — like a mail list. */
  listTime(date: Date): string {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const lang = this.translate.currentLang || this.translate.defaultLang || 'en';
    if (date.getTime() >= start.getTime()) {
      return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    }
    if (date.getTime() >= start.getTime() - 6 * DAY_MS) {
      return date.toLocaleDateString(lang, { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  }

  alertMenu(alert: AppAlert): ContextMenuItem[] {
    return [
      { label: 'Open',   icon: 'open_in_full', action: () => this.select(alert) },
      { label: 'Delete', icon: 'delete',       action: () => this.deleteAlert(alert) },
    ];
  }
}
