import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertsStore } from '../../../application/alerts.store';
import { AppAlert } from '../../../application/alerts.service';
import { AuthStore } from '../../../../auth/application/auth.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';

@Component({
  selector: 'app-alert-inbox',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule, ContextMenuDirective],
  templateUrl: './alert-inbox.component.html',
  styleUrl: './alert-inbox.component.scss',
})
export class AlertInboxComponent implements OnInit {
  private router      = inject(Router);
  private translate   = inject(TranslateService);
  private authStore   = inject(AuthStore);
  readonly store      = inject(AlertsStore);

  get currentRole(): 'admin' | 'client' {
    return this.authStore.isClient() ? 'client' : 'admin';
  }

  get alertsList(): AppAlert[] {
    return this.store.alertsForRole(this.currentRole);
  }

  ngOnInit(): void {
    this.store.markReadForRole(this.currentRole);
  }

  navigateTo(route: string): void {
    if (route) this.router.navigate([route]);
  }

  deleteAlert(event: Event, id: string): void {
    event.stopPropagation();
    this.store.deleteAlert(id);
  }

  clearAll(): void {
    this.store.clearAllForRole(this.currentRole);
  }

  resolveTitle(alert: AppAlert): string {
    return alert.titleKey ? this.translate.instant(alert.titleKey) : (alert.title ?? '');
  }

  resolveDescription(alert: AppAlert): string {
    return alert.descriptionKey ? this.translate.instant(alert.descriptionKey) : (alert.description ?? '');
  }

  alertMenu(alert: AppAlert): ContextMenuItem[] {
    return [
      { label: 'View details', icon: 'open_in_new',  action: () => this.navigateTo(alert.targetRoute) },
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
