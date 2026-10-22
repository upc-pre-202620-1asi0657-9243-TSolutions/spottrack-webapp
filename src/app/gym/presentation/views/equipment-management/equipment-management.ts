import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { EquipmentStatus } from '../../../domain/model/equipment.entity';
import { EquipmentStore } from '../../../application/equipment.store';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { ZoneStore } from '../../../application/zone.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';

export interface EquipmentRow {
  uuid:                 string;
  zoneId:               string;
  name:                 string;
  brand:                string;
  model:                string;
  purchaseAmount:       number;
  purchaseCurrency:     string;
  status:               EquipmentStatus;
  maintenanceThreshold: string | null;
}

@Component({
  selector: 'app-equipment-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    ContextMenuDirective,
  ],
  templateUrl: './equipment-management.html',
  styleUrl: './equipment-management.scss',
})
export class EquipmentManagementComponent {
  private router         = inject(Router);
  private store          = inject(EquipmentStore);
  private adminGymStore  = inject(AdminGymStore);
  readonly zoneStore     = inject(ZoneStore);

  readonly EquipmentStatus   = EquipmentStatus;
  readonly equipmentStatuses = Object.values(EquipmentStatus);
  readonly displayedColumns  = ['id', 'name', 'brand', 'model', 'zoneId', 'purchaseAmount', 'status', 'actions'];

  readonly qrTarget    = signal<EquipmentRow | null>(null);
  readonly testQrUuid  = signal<string | null>(null);

  private readonly gymId = computed(() => this.adminGymStore.primaryGym()?.gymId ?? null);

  constructor() {
    this.adminGymStore.load();
    effect(() => {
      const id = this.gymId();
      if (id) this.zoneStore.load(id);
    });
  }

  searchQuery    = signal('');
  selectedStatus = signal<EquipmentStatus | ''>('');

  readonly isLoading          = this.store.loading;
  readonly totalEquipment     = this.store.equipmentCount;
  readonly availableCount     = this.store.availableCount;
  readonly occupiedCount      = this.store.occupiedCount;
  readonly maintenanceCount   = this.store.maintenanceCount;
  readonly outOfServiceCount  = this.store.outOfServiceCount;

  filteredEquipment = computed(() => {
    const query  = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    return this.store.equipment()
      .filter(e =>
        (!query  || e.name.toLowerCase().includes(query) ||
                    e.brand.toLowerCase().includes(query) ||
                    e.model.toLowerCase().includes(query)) &&
        (!status || e.status === status)
      )
      .map(e => ({
        uuid:                 e.uuid,
        zoneId:               e.zoneId,
        name:                 e.name,
        brand:                e.brand,
        model:                e.model,
        purchaseAmount:       e.purchaseAmount,
        purchaseCurrency:     e.purchaseCurrency,
        status:               e.status,
        maintenanceThreshold: e.maintenanceThreshold,
      } as EquipmentRow));
  });

  zoneName(zoneId: string): string {
    if (!this.zoneStore.loaded()) return '…';
    return this.zoneStore.zones().find(z => z.zoneId === zoneId)?.zoneName ?? '—';
  }

  openQrModal(row: EquipmentRow): void  { this.qrTarget.set(row); }
  closeQrModal(): void                  { this.qrTarget.set(null); this.testQrUuid.set(null); }

  qrUrl(uuid: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(uuid)}&format=png&bgcolor=ffffff&color=000000&margin=10`;
  }

  generateTestQr(): void {
    const uuid = crypto.randomUUID();
    this.testQrUuid.set(uuid);
  }

  navigateToNew(): void {
    this.router.navigate(['/equipments', 'new']);
  }

  navigateToEdit(row: EquipmentRow): void {
    this.router.navigate(['/equipments', row.uuid, 'edit'], { state: { equipment: row } });
  }

  decommissionEquipment(uuid: string): void {
    if (confirm('Decommission this equipment? This action cannot be undone.')) {
      this.store.decommissionEquipment(uuid);
    }
  }

  onSearchChange(value: string): void               { this.searchQuery.set(value); }
  onStatusChange(value: EquipmentStatus | ''): void { this.selectedStatus.set(value); }

  statusIcon(status: EquipmentStatus): string {
    const icons: Record<EquipmentStatus, string> = {
      [EquipmentStatus.AVAILABLE]:      'check_circle',
      [EquipmentStatus.OCCUPIED]:       'person',
      [EquipmentStatus.ACTIVE]:         'bolt',
      [EquipmentStatus.MAINTENANCE]:    'build',
      [EquipmentStatus.OUT_OF_SERVICE]: 'cancel',
      [EquipmentStatus.DECOMMISSIONED]: 'delete_forever',
    };
    return icons[status] ?? 'help';
  }

  rowMenu(row: EquipmentRow): ContextMenuItem[] {
    return [
      { label: 'Edit status',   icon: 'edit',         action: () => this.navigateToEdit(row) },
      { label: 'Decommission',  icon: 'delete',       action: () => this.decommissionEquipment(row.uuid) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'New ticket',    icon: 'build',        action: () => this.router.navigate(['/maintenance/new-ticket']) },
      { label: 'Copy ID',       icon: 'content_copy', action: () => navigator.clipboard.writeText(row.uuid) },
    ];
  }
}
