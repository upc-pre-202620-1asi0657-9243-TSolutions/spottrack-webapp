import { Component, signal, computed, inject, effect, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ReservationStore } from '../../../../reservation/application/reservation.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { Equipment, EquipmentStatus } from '../../../../gym/domain/model/equipment.entity';
import { BranchStore } from '../../../../gym/application/branch.store';
import { ZoneStore } from '../../../../gym/application/zone.store';
import { Zone } from '../../../../gym/domain/model/zone.entity';
import { ActiveGymStore } from '../../../../auth/application/active-gym.store';

export type FilterTab = 'ALL' | 'STRENGTH' | 'CARDIO';
export type ViewMode  = 'MAP' | 'HEATMAP' | 'ALL_BRANCHES';

interface PositionedEquipment {
  eq:       Equipment;
  top:      string;
  left:     string;
  icon:     string;
  category: 'CARDIO' | 'STRENGTH';
}

interface ZoneColumn {
  zone:        Zone | null;
  zoneName:    string;
  colLeftPct:  number;
  colWidthPct: number;
  equipment:   PositionedEquipment[];
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatSelectModule,
    MatChipsModule, MatBadgeModule, TranslateModule, FormsModule,
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnInit {
  @ViewChild('heatCanvas') private heatCanvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly reservationStore = inject(ReservationStore);
  private readonly equipmentStore   = inject(EquipmentStore);
  private readonly branchStore      = inject(BranchStore);
  private readonly zoneStore        = inject(ZoneStore);
  private readonly activeGymStore   = inject(ActiveGymStore);
  private readonly snackBar         = inject(MatSnackBar);
  private readonly translate        = inject(TranslateService);

  readonly selectedBranchId      = signal<string | null>(null);
  readonly viewMode              = signal<ViewMode>('MAP');
  readonly activeFilter          = signal<FilterTab>('ALL');
  readonly selectedMachineId     = signal<string | null>(null);
  readonly showAlternativesPanel = signal(false);

  readonly branches    = this.branchStore.branches;
  readonly dataLoading = computed(() => this.branchStore.loading() || this.zoneStore.loading());
  readonly dataError   = computed(() => this.branchStore.error() ?? this.zoneStore.error() ?? null);

  constructor() {
    // Default selectedBranchId to the first branch once branches load.
    effect(() => {
      const list = this.branchStore.branches();
      if (list.length > 0 && !this.selectedBranchId()) {
        this.selectedBranchId.set(list[0].branchId);
      }
    }, { allowSignalWrites: true });

    // Snackbar on reservation errors.
    effect(() => {
      const err = this.reservationStore.reservationError();
      if (!err) return;
      this.snackBar.open(this.translate.instant(err), '✕', {
        duration: 5000, panelClass: ['error-snackbar'],
        horizontalPosition: 'center', verticalPosition: 'top',
      });
      this.reservationStore.clearError();
    });

    // Redraw heatmap when intensity or view mode changes.
    effect(() => {
      void this.liveIntensityByUuid();
      void this.viewMode();
      setTimeout(() => this.drawMainHeatmap(), 80);
    });
  }

  ngOnInit(): void {
    const gymId = this.activeGymStore.activeGym()?.gymId;
    if (!gymId) return;
    this.branchStore.load(gymId);
    this.zoneStore.load(gymId);
  }

  // ── Client-side join: equipment → zone → branch ──────────────────────────

  private readonly zoneMap = computed((): Map<string, Zone> => {
    const m = new Map<string, Zone>();
    for (const z of this.zoneStore.zones()) m.set(z.zoneId, z);
    return m;
  });

  private readonly selectedBranchZones = computed((): Zone[] => {
    const branchId = this.selectedBranchId();
    return branchId
      ? this.zoneStore.zones().filter(z => z.branchId === branchId)
      : [];
  });

  // Zones for the current branch as visual columns.
  // Equipment zoned to a different branch is excluded.
  // Equipment with no matching zone falls into an "Unassigned" column.
  readonly zoneLayout = computed((): ZoneColumn[] => {
    const zones    = this.selectedBranchZones();
    const allEq    = this.equipmentStore.equipment();
    const zMap     = this.zoneMap();
    const branchId = this.selectedBranchId();

    const buckets = new Map<string, Equipment[]>();
    for (const z of zones) buckets.set(z.zoneId, []);
    const unzoned: Equipment[] = [];

    for (const eq of allEq) {
      const zone = zMap.get(eq.zoneId);
      if (zone && zone.branchId === branchId) {
        buckets.get(zone.zoneId)!.push(eq);
      } else if (!zone) {
        unzoned.push(eq);
      }
    }

    type RawCol = { zone: Zone | null; zoneName: string; equipment: Equipment[] };
    const cols: RawCol[] = zones.map(z => ({
      zone: z, zoneName: z.zoneName, equipment: buckets.get(z.zoneId) ?? [],
    }));
    if (unzoned.length > 0) {
      cols.push({ zone: null, zoneName: '__unzoned__', equipment: unzoned });
    }

    const n = cols.length || 1;
    return cols.map((col, i) => {
      const colLeftPct  = (i / n) * 100;
      const colWidthPct = 100 / n;
      return {
        ...col,
        colLeftPct,
        colWidthPct,
        equipment: col.equipment.map((eq, j) => ({
          eq,
          ...this.autoPositionInZone(j, col.equipment.length, colLeftPct, colWidthPct),
          icon:     this.resolveIcon(eq.name),
          category: this.equipmentCategory(eq.name),
        })),
      };
    });
  });

  get filteredZoneLayout(): ZoneColumn[] {
    const f = this.activeFilter();
    if (f === 'ALL') return this.zoneLayout();
    return this.zoneLayout().map(col => ({
      ...col,
      equipment: col.equipment.filter(e => e.category === f),
    }));
  }

  // ── Branch-level helpers for ALL_BRANCHES view ────────────────────────────

  branchEquipment(branchId: string): Equipment[] {
    const zoneIds = new Set(
      this.zoneStore.zones()
        .filter(z => z.branchId === branchId)
        .map(z => z.zoneId)
    );
    return this.equipmentStore.equipment().filter(eq => zoneIds.has(eq.zoneId));
  }

  branchAvailable(branchId: string): number {
    return this.branchEquipment(branchId)
      .filter(e => e.status === EquipmentStatus.AVAILABLE).length;
  }

  branchInUse(branchId: string): number {
    return this.branchEquipment(branchId)
      .filter(e => e.status === EquipmentStatus.OCCUPIED || e.status === EquipmentStatus.ACTIVE).length;
  }

  branchUtilization(branchId: string): number {
    const eq    = this.branchEquipment(branchId);
    const total = eq.length || 1;
    return Math.round(((total - this.branchAvailable(branchId)) / total) * 100);
  }

  branchMiniMapItems(branchId: string): { top: string; left: string; icon: string; key: string }[] {
    const eq = this.branchEquipment(branchId);
    return eq.map((e, i) => ({
      ...this.autoPositionInZone(i, eq.length, 0, 100),
      icon: this.resolveIcon(e.name),
      key:  e.uuid,
    }));
  }

  // ── Stats for selected branch ─────────────────────────────────────────────

  get availableCount(): number {
    const id = this.selectedBranchId();
    return id ? this.branchAvailable(id) : 0;
  }
  get inUseCount(): number {
    const id = this.selectedBranchId();
    return id ? this.branchInUse(id) : 0;
  }
  get reservedCount(): number {
    return this.reservationStore.activeReservations().filter(r => !r.timerExpiry).length;
  }
  get utilization(): number {
    const id = this.selectedBranchId();
    return id ? this.branchUtilization(id) : 0;
  }

  // ── Selected equipment detail ─────────────────────────────────────────────

  readonly selectedEquipment = computed((): PositionedEquipment | null => {
    const uuid = this.selectedMachineId();
    if (!uuid) return null;
    return this.zoneLayout().flatMap(c => c.equipment).find(e => e.eq.uuid === uuid) ?? null;
  });

  readonly alternativeEquipment = computed((): PositionedEquipment[] => {
    const sel = this.selectedEquipment();
    if (!sel) return [];
    return this.zoneLayout()
      .flatMap(c => c.equipment)
      .filter(e =>
        e.eq.status === EquipmentStatus.AVAILABLE &&
        e.eq.uuid !== sel.eq.uuid &&
        e.category === sel.category
      );
  });

  // ── Pending reservations ──────────────────────────────────────────────────

  private readonly pendingUuids = computed(() =>
    new Set(
      this.reservationStore.activeReservations()
        .filter(r => !r.timerExpiry)
        .map(r => r.equipmentId)
    )
  );

  isPending(uuid: string): boolean { return this.pendingUuids().has(uuid); }

  isInUse(status: EquipmentStatus): boolean {
    return status === EquipmentStatus.OCCUPIED || status === EquipmentStatus.ACTIVE;
  }

  pinStatusClass(uuid: string, status: EquipmentStatus): string {
    if (this.pendingUuids().has(uuid)) return 'pin-reserved';
    switch (status) {
      case EquipmentStatus.OCCUPIED:
      case EquipmentStatus.ACTIVE:         return 'pin-in-use';
      case EquipmentStatus.MAINTENANCE:    return 'pin-reserved';
      case EquipmentStatus.OUT_OF_SERVICE:
      case EquipmentStatus.DECOMMISSIONED: return 'pin-pending';
      default:                             return 'pin-available';
    }
  }

  // ── Heatmap intensity ─────────────────────────────────────────────────────

  readonly usageByUuid = computed((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const r of this.reservationStore.history()) {
      if (r.equipmentId) counts[r.equipmentId] = (counts[r.equipmentId] ?? 0) + 1;
    }
    return counts;
  });

  readonly liveIntensityByUuid = computed((): Record<string, number> => {
    const pending = this.pendingUuids();
    const result: Record<string, number> = {};
    for (const eq of this.equipmentStore.equipment()) {
      switch (eq.status) {
        case EquipmentStatus.OCCUPIED:       result[eq.uuid] = 1.0;  break;
        case EquipmentStatus.ACTIVE:         result[eq.uuid] = 0.8;  break;
        case EquipmentStatus.OUT_OF_SERVICE: result[eq.uuid] = 0.55; break;
        case EquipmentStatus.MAINTENANCE:    result[eq.uuid] = 0.45; break;
        default: result[eq.uuid] = pending.has(eq.uuid) ? 0.65 : 0.0;
      }
    }
    return result;
  });

  getBranchHeatColor(branchId: string, uuid: string): string {
    const t = this.liveIntensityByUuid()[uuid] ?? 0;
    const [r, g, b] = this.rgbFromIntensity(t);
    return `rgb(${r},${g},${b})`;
  }

  getBranchHeatOpacity(_branchId: string, uuid: string): number {
    return this.liveIntensityByUuid()[uuid] ?? 0;
  }

  // ── Canvas heatmap ────────────────────────────────────────────────────────

  private drawMainHeatmap(): void {
    if (this.viewMode() !== 'HEATMAP') return;
    const canvas = this.heatCanvasRef?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const W = parent.offsetWidth, H = parent.offsetHeight;
    if (!W || !H) return;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const items     = this.zoneLayout().flatMap(col => col.equipment)
      .map(e => ({ key: e.eq.uuid, top: e.top, left: e.left }));
    const intensity = this.liveIntensityByUuid();
    const sorted    = [...items].sort((a, b) => (intensity[a.key] ?? 0) - (intensity[b.key] ?? 0));

    for (const item of sorted) {
      const t         = intensity[item.key] ?? 0;
      const x         = (parseFloat(item.left) / 100) * W;
      const y         = (parseFloat(item.top)  / 100) * H;
      const radius    = 150 + t * 110;
      const [r, g, b] = this.rgbFromIntensity(t);
      const alpha     = t > 0 ? 0.10 + t * 0.38 : 0.04;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.35})`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private rgbFromIntensity(t: number): [number, number, number] {
    if (t <= 0)   return [30, 80, 200];
    if (t < 0.25) return [0, Math.round(t * 4 * 150), 255];
    if (t < 0.5)  { const s = (t - 0.25) * 4; return [0, 150 + Math.round(s * 105), Math.round(255 * (1 - s))]; }
    if (t < 0.75) { const s = (t - 0.5)  * 4; return [Math.round(s * 255), 255, 0]; }
    const s = (t - 0.75) * 4; return [255, Math.round(255 * (1 - s)), 0];
  }

  // ── Auto-positioning within a zone column ─────────────────────────────────

  private autoPositionInZone(
    i: number, total: number, colLeftPct: number, colWidthPct: number,
  ): { top: string; left: string } {
    const n       = Math.max(1, total);
    const cols    = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(n))));
    const rows    = Math.ceil(n / cols);
    const col     = i % cols;
    const row     = Math.floor(i / cols);
    const margin  = colWidthPct * 0.08;
    const usableW = colWidthPct - 2 * margin;
    const cellW   = usableW / cols;
    const cellH   = 62 / Math.max(rows, 1);
    return {
      left: `${colLeftPct + margin + col * cellW + cellW * 0.5}%`,
      top:  `${22 + row * cellH + cellH * 0.5}%`,
    };
  }

  private resolveIcon(name: string): string {
    const n = name.toLowerCase();
    if (/treadmill|cinta|running/.test(n)) return 'directions_run';
    if (/bike|cycl|bicicleta/.test(n))     return 'directions_bike';
    if (/elliptic|elíptic/.test(n))         return 'directions_bike';
    if (/row|remo/.test(n))                 return 'rowing';
    return 'fitness_center';
  }

  private equipmentCategory(name: string): 'CARDIO' | 'STRENGTH' {
    const n = name.toLowerCase();
    return /treadmill|bike|cycl|elliptic|row|cardio|cinta|remo|bicicleta/.test(n)
      ? 'CARDIO' : 'STRENGTH';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  setFilter(f: FilterTab): void { this.activeFilter.set(f); }

  openEquipmentDetail(uuid: string, event: Event): void {
    event.stopPropagation();
    this.selectedMachineId.set(uuid);
    this.showAlternativesPanel.set(false);
  }

  closeMachineDetail():  void { this.selectedMachineId.set(null); this.showAlternativesPanel.set(false); }
  openAlternatives():    void { this.showAlternativesPanel.set(true); }

  selectBranch(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.viewMode.set('MAP');
  }

  reserveMachine(): void {
    const eq = this.selectedEquipment();
    if (!eq) return;
    this.closeMachineDetail();
    this.reservationStore.createReservation(eq.eq.uuid, 15 * 60);
  }

  private notify(key: string): void {
    this.snackBar.open(this.translate.instant(key), '✓', {
      duration: 3500, panelClass: ['routine-snackbar'],
      horizontalPosition: 'center', verticalPosition: 'top',
    });
  }

  notifyWhenFree():   void { this.notify('map.detail.notifications.notified'); }
  reportAsFree():     void { this.notify('map.detail.notifications.reportedFree'); }
  reportAsOccupied(): void { this.notify('map.detail.notifications.reportedOccupied'); }
}
