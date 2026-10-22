import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Equipment, EquipmentStatus } from '../../../domain/model/equipment.entity';
import { EquipmentStore } from '../../../application/equipment.store';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { BranchStore } from '../../../application/branch.store';
import { ZoneStore } from '../../../application/zone.store';
import { EquipmentRow } from '../equipment-management/equipment-management';

export const CURRENCIES = ['USD', 'EUR', 'PEN', 'MXN', 'COP', 'GBP', 'BRL'] as const;

@Component({
  selector: 'app-add-equipment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
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

  readonly equipmentStatuses = Object.values(EquipmentStatus);
  readonly currencies        = CURRENCIES;

  private existing: EquipmentRow | undefined = (history.state as { equipment?: EquipmentRow }).equipment;
  readonly isEditMode = !!this.route.snapshot.paramMap.get('id');

  form = this.fb.nonNullable.group({
    name:             [{ value: this.existing?.name  ?? '', disabled: this.isEditMode },  Validators.required],
    brand:            [{ value: this.existing?.brand ?? '', disabled: this.isEditMode },  Validators.required],
    model:            [{ value: this.existing?.model ?? '', disabled: this.isEditMode },  Validators.required],
    zoneId:           [{ value: this.existing?.zoneId ?? '', disabled: this.isEditMode }, Validators.required],
    purchaseAmount:   [{ value: this.existing?.purchaseAmount ?? (null as unknown as number), disabled: this.isEditMode }, [Validators.required, Validators.min(0)]],
    purchaseCurrency: [{ value: this.existing?.purchaseCurrency ?? 'USD', disabled: this.isEditMode }, Validators.required],
    status:           [this.existing?.status ?? EquipmentStatus.AVAILABLE, Validators.required],
    maintenanceThreshold: [this.existing?.maintenanceThreshold ?? ''],
  });

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

  constructor() {
    this.adminGymStore.load();

    effect(() => {
      const gymId = this.adminGymStore.primaryGym()?.gymId;
      if (gymId) {
        this.zoneStore.load(gymId);
        this.branchStore.load(gymId);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();

    if (this.isEditMode && this.existing?.uuid) {
      this.store.updateEquipmentStatus(this.existing.uuid, val.status);
      if (val.maintenanceThreshold && val.maintenanceThreshold !== this.existing.maintenanceThreshold) {
        this.store.defineMaintenanceThreshold(this.existing.uuid, val.maintenanceThreshold);
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
