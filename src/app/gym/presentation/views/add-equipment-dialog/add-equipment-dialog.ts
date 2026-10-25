import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Equipment, EquipmentStatus } from '../../../domain/model/equipment.entity';
import { EquipmentStore } from '../../../application/equipment.store';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { BranchStore } from '../../../application/branch.store';
import { ZoneStore } from '../../../application/zone.store';
import { EquipmentRow } from '../equipment-management/equipment-management';

export const CURRENCIES = ['USD', 'EUR', 'PEN', 'MXN', 'COP', 'GBP', 'BRL'] as const;

export const STATUS_ICONS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]:      'check_circle',
  [EquipmentStatus.OCCUPIED]:       'person',
  [EquipmentStatus.ACTIVE]:         'bolt',
  [EquipmentStatus.MAINTENANCE]:    'build',
  [EquipmentStatus.OUT_OF_SERVICE]: 'cancel',
  [EquipmentStatus.DECOMMISSIONED]: 'delete_forever',
};

@Component({
  selector: 'app-add-equipment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './add-equipment-dialog.html',
  styleUrl: './add-equipment-dialog.scss',
})
export class AddEquipmentDialogComponent {
  private fb            = inject(FormBuilder);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  private store         = inject(EquipmentStore);
  readonly adminGymStore = inject(AdminGymStore);
  readonly branchStore   = inject(BranchStore);
  readonly zoneStore     = inject(ZoneStore);

  // Decommissioning has its own action in the equipment table.
  readonly equipmentStatuses = Object.values(EquipmentStatus).filter(s => s !== EquipmentStatus.DECOMMISSIONED);
  readonly currencies        = CURRENCIES;

  private readonly editId     = this.route.snapshot.paramMap.get('id');
  private readonly stateRow   = (history.state as { equipment?: EquipmentRow }).equipment;
  readonly isEditMode = !!this.editId;

  /** Row passed by the table, or — after a reload, when history.state is gone — the machine from the store. */
  readonly existing = computed<EquipmentRow | undefined>(() => {
    if (!this.editId) return undefined;
    if (this.stateRow?.uuid === this.editId) return this.stateRow;
    const e = this.store.equipment().find(eq => eq.uuid === this.editId);
    return e && {
      uuid: e.uuid, zoneId: e.zoneId, name: e.name, brand: e.brand, model: e.model,
      purchaseAmount: e.purchaseAmount, purchaseCurrency: e.purchaseCurrency,
      status: e.status, maintenanceThreshold: e.maintenanceThreshold,
    };
  });

  form = this.fb.nonNullable.group({
    name:             ['', Validators.required],
    brand:            ['', Validators.required],
    model:            ['', Validators.required],
    zoneId:           ['', Validators.required],
    purchaseAmount:   [null as unknown as number, [Validators.required, Validators.min(0)]],
    purchaseCurrency: ['USD', Validators.required],
    status:           [EquipmentStatus.AVAILABLE, Validators.required],
    maintenanceThreshold: [''],
  });

  /** Live form values for the preview card. */
  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly groupedZones = computed(() => {
    const zones    = this.zoneStore.zones();
    const branches = this.branchStore.branches();
    return branches
      .map(branch => ({
        branch,
        zones: zones.filter(z => z.branchId === branch.branchId),
      }))
      .filter(g => g.zones.length > 0);
  });

  readonly previewZone = computed(() => {
    const zoneId = this.value().zoneId;
    const zone   = this.zoneStore.zones().find(z => z.zoneId === zoneId);
    if (!zone) return null;
    const branch = this.branchStore.branches().find(b => b.branchId === zone.branchId);
    return branch ? `${zone.zoneName} · ${branch.name}` : zone.zoneName;
  });

  constructor() {
    this.adminGymStore.load();

    effect(() => {
      const gymId = this.adminGymStore.primaryGym()?.gymId;
      if (gymId) {
        this.zoneStore.load(gymId);
        this.branchStore.load(gymId);
      }
    });

    // Fill the form once the machine is known, without overwriting edits in progress.
    effect(() => {
      const row = this.existing();
      if (row && this.form.pristine) {
        this.form.reset({
          name: row.name, brand: row.brand, model: row.model, zoneId: row.zoneId,
          purchaseAmount: row.purchaseAmount, purchaseCurrency: row.purchaseCurrency,
          status: row.status, maintenanceThreshold: row.maintenanceThreshold ?? '',
        });
      }
    });
  }

  statusIcon(status: EquipmentStatus | string | undefined): string {
    return STATUS_ICONS[status as EquipmentStatus] ?? 'help';
  }

  /** Errors show once the user has left the field, not while typing the first character. */
  showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  setStatus(status: EquipmentStatus): void {
    this.form.controls.status.setValue(status);
    this.form.controls.status.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.getRawValue();

    const row = this.existing();
    if (this.isEditMode && row) {
      // Each part has its own endpoint; only call the ones whose fields changed.
      const detailsChanged =
        val.name.trim() !== row.name || val.brand.trim() !== row.brand || val.model.trim() !== row.model ||
        val.zoneId !== row.zoneId || Number(val.purchaseAmount) !== row.purchaseAmount ||
        val.purchaseCurrency !== row.purchaseCurrency;
      if (detailsChanged) {
        this.store.updateEquipmentDetails(row.uuid, {
          name: val.name.trim(), brand: val.brand.trim(), model: val.model.trim(), zoneId: val.zoneId,
          purchaseAmount: Number(val.purchaseAmount), purchaseCurrency: val.purchaseCurrency,
        });
      }
      if (val.status !== row.status) {
        this.store.updateEquipmentStatus(row.uuid, val.status);
      }
      if (val.maintenanceThreshold && val.maintenanceThreshold !== row.maintenanceThreshold) {
        this.store.defineMaintenanceThreshold(row.uuid, val.maintenanceThreshold);
      }
    } else {
      const entity = new Equipment({
        uuid:                 '',
        name:                 val.name,
        brand:                val.brand,
        model:                val.model,
        zoneId:               val.zoneId,
        purchaseAmount:       val.purchaseAmount,
        purchaseCurrency:     val.purchaseCurrency,
        status:               val.status,
        maintenanceThreshold: val.maintenanceThreshold || null,
      });
      this.store.addEquipment(entity);
    }

    this.router.navigate(['/equipments']);
  }

  cancel(): void {
    this.router.navigate(['/equipments']);
  }
}
