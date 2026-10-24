import { Component, computed, DestroyRef, effect, EventEmitter, HostBinding, inject, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { AdminGymStore } from '../../../../gym/application/admin-gym.store';
import { BranchStore } from '../../../../gym/application/branch.store';
import { MembershipStore } from '../../../../membership/application/membership.store';
import { MaintenanceStore } from '../../../../maintenance/application/maintenance.store';
import { MonitoringStore } from '../../../../monitoring/application/monitoring.store';
import { AlertsService } from '../../../../alerts/application/alerts.service';

export type NavBadge = 'maintenance' | 'alerts' | 'iot';

export interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  badge?: NavBadge;
}

export interface NavSection {
  labelKey?: string;
  items: NavItem[];
}

const ADMIN_NAV: NavSection[] = [
  {
    labelKey: 'nav.sections.overview',
    items: [{ path: '/dashboard', icon: 'space_dashboard', labelKey: 'nav.dashboard' }],
  },
  {
    labelKey: 'nav.sections.operations',
    items: [
      { path: '/equipments', icon: 'fitness_center', labelKey: 'nav.equipment' },
      { path: '/iot', icon: 'sensors', labelKey: 'nav.iot', badge: 'iot' },
      { path: '/maintenance', icon: 'build', labelKey: 'nav.maintenance', badge: 'maintenance' },
    ],
  },
  {
    labelKey: 'nav.sections.insights',
    items: [
      { path: '/analytics', icon: 'bar_chart', labelKey: 'nav.analytics' },
      { path: '/financial-impact', icon: 'attach_money', labelKey: 'nav.financial' },
    ],
  },
  {
    labelKey: 'nav.sections.account',
    items: [
      { path: '/membership', icon: 'workspace_premium', labelKey: 'nav.membership' },
      { path: '/alerts', icon: 'notifications', labelKey: 'nav.alerts', badge: 'alerts' },
      { path: '/settings', icon: 'settings', labelKey: 'nav.settings' },
    ],
  },
];

const CLIENT_NAV: NavSection[] = [
  {
    items: [
      { path: '/client', icon: 'home', labelKey: 'nav.dashboard' },
      { path: '/map', icon: 'map', labelKey: 'nav.map' },
      { path: '/routines', icon: 'fitness_center', labelKey: 'nav.routines' },
      { path: '/bookings', icon: 'event_available', labelKey: 'nav.bookings' },
      { path: '/profile', icon: 'person', labelKey: 'nav.profile' },
    ],
  },
];

/** Motion sensors report connectivity through heartbeats; refresh the count on a slow cadence. */
const SENSOR_REFRESH_MS = 30000;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatMenuModule, TranslateModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly adminGymStore            = inject(AdminGymStore);
  private readonly branchStore      = inject(BranchStore);
  private readonly membershipStore  = inject(MembershipStore);
  private readonly maintenanceStore = inject(MaintenanceStore);
  private readonly monitoringStore  = inject(MonitoringStore);
  private readonly alertsService    = inject(AlertsService);

  sections: NavSection[] = ADMIN_NAV;
  isAdmin = true;

  @Input()
  set role(value: 'admin' | 'client') {
    this.isAdmin = value === 'admin';
    this.sections = this.isAdmin ? ADMIN_NAV : CLIENT_NAV;
  }

  @Input() @HostBinding('class.open') open = false;

  @Output() linkClicked = new EventEmitter<void>();

  // ── Gym menu ──────────────────────────────────────────────────────────────
  readonly gym         = this.adminGymStore.primaryGym;
  readonly gymInitial  = computed(() => (this.gym()?.name ?? '?').trim().charAt(0).toUpperCase());
  readonly branchCount = computed(() => this.branchStore.branches().length);
  readonly planTier    = computed(() => {
    const tier = this.membershipStore.myMembership()?.membershipTier;
    return tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : null; // PLATINUM → Platinum
  });

  // ── Live counts ───────────────────────────────────────────────────────────
  readonly openTickets   = computed(() => this.maintenanceStore.pendingTickets().length);
  readonly unreadAlerts  = computed(() => this.alertsService.alerts().filter(a => !a.read).length);
  readonly sensorsTotal  = computed(() => this.monitoringStore.motionSensors().length);
  readonly sensorsOnline = computed(() => this.monitoringStore.motionSensors().filter(s => s.online).length);
  readonly sensorHealth  = computed<'ok' | 'partial' | 'down'>(() => {
    const total = this.sensorsTotal();
    const online = this.sensorsOnline();
    return online === total ? 'ok' : online > 0 ? 'partial' : 'down';
  });

  private branchesLoadedFor: string | null = null;

  constructor() {
    // The branch count belongs to the primary gym; load it once per gym (a gym may have none).
    effect(() => {
      const gymId = this.gym()?.gymId;
      if (gymId && gymId !== this.branchesLoadedFor) {
        this.branchesLoadedFor = gymId;
        this.branchStore.load(gymId);
      }
    });

    if (!this.membershipStore.myMembership()) this.membershipStore.loadMyMembership();
    if (!this.monitoringStore.motionSensors().length) this.monitoringStore.loadMotionSensors();
    const timer = setInterval(() => this.monitoringStore.refreshMotionSensors(), SENSOR_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  badgeCount(badge: NavBadge | undefined): number {
    if (badge === 'maintenance') return this.openTickets();
    if (badge === 'alerts') return this.unreadAlerts();
    return 0;
  }
}
