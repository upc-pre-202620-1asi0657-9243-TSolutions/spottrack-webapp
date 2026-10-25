import { Component, signal, computed, inject, effect, OnInit } from '@angular/core';
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
  subZone:  'CARDIO' | 'FREE_WEIGHTS' | 'UPPER_BODY' | 'LOWER_BODY';
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

    // Redraw heatmap colours whenever intensity or view mode changes.
    // The CSS approach is signal-reactive — no manual redraw needed.
    // (Kept as no-op to preserve structure in case canvas is re-added later.)
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
          subZone:  this.resolveSubZone(eq.name),
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
    // Matches the organic blob palette: teal (cold) → orange → magenta (hot)
    if (t <= 0)    return 'rgb(0,180,160)';
    if (t < 0.5)   return `rgb(255,${Math.round(160 - t * 200)},0)`;
    return `rgb(255,${Math.round(20 + (1 - t) * 60)},${Math.round(t * 30)})`;
  }

  getBranchHeatOpacity(_branchId: string, uuid: string): number {
    return this.liveIntensityByUuid()[uuid] ?? 0;
  }

  // ── CSS-driven organic heatmap helpers ───────────────────────────────────

  /**
   * Returns a multi-stop radial-gradient that mimics the thermal reference:
   *   core (magenta/red) → orange → yellow → teal → transparent edge
   * Intensity 0 (cold/available) → soft teal-blue blob
   * Intensity 1 (hot/occupied)  → bright magenta-red core + wide bloom
   */
  heatGradient(uuid: string): string {
    const t = this.liveIntensityByUuid()[uuid] ?? 0;

    if (t <= 0.05) {
      // Cold machine — diffuse teal-blue whisper
      return [
        'radial-gradient(ellipse at center,',
        '  rgba(0,200,180,0.55)   0%,',
        '  rgba(0,150,200,0.30)  25%,',
        '  rgba(20,80,160,0.14)  55%,',
        '  rgba(10,30,80,0.04)   80%,',
        '  transparent           100%)',
      ].join('\n');
    }

    // Hot colour stops scale with t
    const coreAlpha   = 0.55 + t * 0.40;          // 0.55 → 0.95
    const midAlpha    = 0.30 + t * 0.30;           // 0.30 → 0.60
    const outerAlpha  = 0.08 + t * 0.20;           // 0.08 → 0.28

    // Core colour transitions magenta → red as intensity rises
    const coreMagenta = `rgba(255,${Math.round(20 + (1 - t) * 60)},${Math.round(t * 30)},${coreAlpha.toFixed(2)})`;
    const innerOrange = `rgba(255,${Math.round(80 + (1 - t) * 80)},0,${(coreAlpha * 0.7).toFixed(2)})`;
    const midYellow   = `rgba(255,${Math.round(180 + (1 - t) * 60)},0,${midAlpha.toFixed(2)})`;
    const outerTeal   = `rgba(0,${Math.round(180 + t * 60)},${Math.round(150 - t * 100)},${outerAlpha.toFixed(2)})`;

    return [
      'radial-gradient(ellipse at center,',
      `  ${coreMagenta}          0%,`,
      `  ${innerOrange}         18%,`,
      `  ${midYellow}           38%,`,
      `  ${outerTeal}           65%,`,
      '  rgba(0,60,100,0.03)   85%,',
      '  transparent           100%)',
    ].join('\n');
  }

  /**
   * Returns the blob diameter as CSS px string.
   * Cold machines: 120px  |  Hot machines: 340px
   */
  heatRadius(uuid: string): string {
    const t = this.liveIntensityByUuid()[uuid] ?? 0;
    // Larger blobs: 200px (cold) → 420px (hot) for full zone coverage
    const px = Math.round(200 + t * 220);
    return `${px}px`;
  }

  /**
   * Returns a CSS colour for the ghost pin border ring that matches the
   * current heat level (teal when cold, magenta when hot).
   */
  heatBorderColor(uuid: string): string {
    const t = this.liveIntensityByUuid()[uuid] ?? 0;
    if (t <= 0.05) return 'rgba(0,200,180,0.55)';
    if (t < 0.5)   return `rgba(255,${Math.round(160 - t * 200)},0,0.7)`;
    return `rgba(255,${Math.round(20 + (1 - t) * 60)},${Math.round(t * 20)},0.85)`;
  }

  /**
   * Computes the zone-level ambient thermal gradient.
   * One large, diffuse blob per training zone, based on the average
   * utilization intensity of all equipment in that zone.
   * Cold zones: teal-blue  |  Warm zones: orange-yellow  |  Hot: magenta-red
   */
  zoneAmbient(equipment: PositionedEquipment[]): string {
    if (equipment.length === 0) {
      // No equipment — faint cold teal whisper
      return [
        'radial-gradient(ellipse at 50% 50%,',
        '  rgba(0,100,180,0.30)   0%,',
        '  rgba(0,60,140,0.18)   45%,',
        '  rgba(0,30,80,0.06)    75%,',
        '  transparent           100%)',
      ].join(' ');
    }
    const avgT = equipment.reduce(
      (sum, e) => sum + (this.liveIntensityByUuid()[e.eq.uuid] ?? 0), 0
    ) / equipment.length;

    if (avgT <= 0.08) {
      // Cold zone — cyan-teal base
      return [
        'radial-gradient(ellipse at 50% 50%,',
        '  rgba(0,190,210,0.50)   0%,',
        '  rgba(0,120,190,0.30)  40%,',
        '  rgba(0,70,160,0.14)   70%,',
        '  transparent           100%)',
      ].join(' ');
    }

    // Warm/hot zone — interpolate cyan → orange → magenta
    const a1 = 0.40 + avgT * 0.45;   // centre alpha
    const a2 = 0.20 + avgT * 0.30;   // mid alpha
    const g  = Math.round(150 - avgT * 130);   // green channel drops as temp rises
    const b  = Math.round(30  - avgT * 30);    // blue channel
    return [
      'radial-gradient(ellipse at 50% 50%,',
      `  rgba(255,${g},${Math.max(0,b)},${a1.toFixed(2)})  0%,`,
      `  rgba(255,${Math.round(g*1.4)},0,${a2.toFixed(2)})  40%,`,
      '  rgba(0,100,180,0.12)   75%,',
      '  transparent            100%)',
    ].join(' ');
  }


  // ── Blueprint-level heat blob positioning ────────────────────────────────
  //
  // The gym-blueprint is divided into this approximate percentage grid:
  //   Width: Training 0–62%, Support 62–100%
  //   Height inside training block (flex 1.1 + 1 + 1 = 3.1 units):
  //     Cardio:      0% – 35.5%
  //     Middle row:  35.5% – 67.7%  (Free Weights 0–34% W, Studio 34–62% W)
  //     Bottom row:  67.7% – 100%   (Upper Body 0–31% W, Lower Body 31–62% W)

  private heatBlobInZone(i: number, total: number): { rTop: number; rLeft: number } {
    const n    = Math.max(1, total);
    const cols = Math.min(4, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    return {
      rLeft: ((col + 0.5) / cols) * 100,
      rTop:  ((row + 0.5) / rows) * 100,
    };
  }

  blueprintHeatPos(
    i: number, total: number,
    subZone: 'CARDIO' | 'FREE_WEIGHTS' | 'UPPER_BODY' | 'LOWER_BODY',
  ): { top: string; left: string } {
    const bounds: Record<string, { x0: number; x1: number; y0: number; y1: number }> = {
      CARDIO:       { x0: 0,  x1: 62, y0: 0,    y1: 35.5 },
      FREE_WEIGHTS: { x0: 2,  x1: 34, y0: 35.5, y1: 67.7 },
      UPPER_BODY:   { x0: 2,  x1: 31, y0: 67.7, y1: 100  },
      LOWER_BODY:   { x0: 32, x1: 61, y0: 67.7, y1: 100  },
    };
    const b = bounds[subZone];
    const { rTop, rLeft } = this.heatBlobInZone(i, total);
    const top  = b.y0 + (rTop  / 100) * (b.y1 - b.y0);
    const left = b.x0 + (rLeft / 100) * (b.x1 - b.x0);
    return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` };
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

  /**
   * Determines which sub-zone of the floor plan this equipment belongs to.
   * Falls back to FREE_WEIGHTS for any unrecognised STRENGTH equipment.
   */
  private resolveSubZone(
    name: string,
  ): 'CARDIO' | 'FREE_WEIGHTS' | 'UPPER_BODY' | 'LOWER_BODY' {
    const n = name.toLowerCase();
    if (/treadmill|cinta|running|bike|cycl|bicicleta|elliptic|el[íi]ptic|remo|rowing|cardio/.test(n))
      return 'CARDIO';
    if (/leg|pierna|squat|sentadilla|leg.*curl|leg.*press|calf|pantorrilla|gl[uú]teo|abductor|aductor|lower.*body|inferior/.test(n))
      return 'LOWER_BODY';
    if (/cable|pecho|chest|shoulder|hombro|tr[íi]cep|b[íi]cep|curl|press|inclin|decline|fly|espalda|back|dorsal|lat|upper.*body|superior|multigimnasio|multi.*funci/.test(n))
      return 'UPPER_BODY';
    return 'FREE_WEIGHTS';
  }

  // ── Floor plan sub-zone distribution getters ──────────────────────────────

  get allPositionedEquipment(): PositionedEquipment[] {
    return this.filteredZoneLayout.flatMap(col => col.equipment);
  }

  get cardioEquipment(): PositionedEquipment[] {
    return this.allPositionedEquipment.filter(e => e.subZone === 'CARDIO');
  }

  private get strengthGrouped() {
    const strength = this.allPositionedEquipment.filter(e => e.category === 'STRENGTH');
    const groups: Record<string, PositionedEquipment[]> = {
      'FREE_WEIGHTS': [],
      'UPPER_BODY': [],
      'LOWER_BODY': []
    };
    
    // Pass 1: Strict matching
    const unassigned: PositionedEquipment[] = [];
    for (const eq of strength) {
      if (eq.subZone === 'FREE_WEIGHTS' || eq.subZone === 'UPPER_BODY' || eq.subZone === 'LOWER_BODY') {
        groups[eq.subZone].push(eq);
      } else {
        unassigned.push(eq);
      }
    }

    // Pass 2: Distribute unassigned evenly across the 3 zones
    const zones = ['FREE_WEIGHTS', 'UPPER_BODY', 'LOWER_BODY'];
    unassigned.forEach((eq, i) => {
      groups[zones[i % 3]].push(eq);
    });

    return groups;
  }

  get freeWeightsEquipment(): PositionedEquipment[] {
    return this.strengthGrouped['FREE_WEIGHTS'];
  }

  get upperBodyEquipment(): PositionedEquipment[] {
    return this.strengthGrouped['UPPER_BODY'];
  }

  get lowerBodyEquipment(): PositionedEquipment[] {
    return this.strengthGrouped['LOWER_BODY'];
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
