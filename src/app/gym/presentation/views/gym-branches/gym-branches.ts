import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { BranchStore } from '../../../application/branch.store';
import { ZoneStore } from '../../../application/zone.store';

@Component({
  selector: 'app-gym-branches',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule, RouterLink],
  templateUrl: './gym-branches.html',
  styleUrl:    './gym-branches.scss',
})
export class GymBranchesComponent {
  readonly adminGymStore = inject(AdminGymStore);
  readonly branchStore   = inject(BranchStore);
  readonly zoneStore     = inject(ZoneStore);

  nameInput    = '';
  addressInput = '';

  zoneNameInput      = '';
  zoneOccupancyInput: number | null = null;

  readonly gymId            = computed(() => this.adminGymStore.primaryGym()?.gymId ?? null);
  readonly expandedBranchId = signal<string | null>(null);

  constructor() {
    this.adminGymStore.load();

    effect(() => {
      const id = this.gymId();
      if (id) {
        this.branchStore.load(id);
        this.zoneStore.load(id);
      }
    });
  }

  addBranch(): void {
    const id      = this.gymId();
    const name    = this.nameInput.trim();
    const address = this.addressInput.trim();
    if (!id || !name || !address) return;

    this.branchStore.create(id, name, address);
    this.nameInput    = '';
    this.addressInput = '';
  }

  onInputChange(): void {
    this.branchStore.clearCreateError();
  }

  toggleBranch(branchId: string): void {
    this.expandedBranchId.update(cur => cur === branchId ? null : branchId);
    this.zoneNameInput      = '';
    this.zoneOccupancyInput = null;
    this.zoneStore.clearCreateError();
  }

  zonesFor(branchId: string) {
    return this.zoneStore.zones().filter(z => z.branchId === branchId);
  }

  addZone(branchId: string): void {
    const gymId = this.gymId();
    const name  = this.zoneNameInput.trim();
    const occ   = this.zoneOccupancyInput;
    if (!gymId || !name || occ == null || occ < 1) return;

    this.zoneStore.create(gymId, branchId, name, occ);
    this.zoneNameInput      = '';
    this.zoneOccupancyInput = null;
  }

  onZoneInputChange(): void {
    this.zoneStore.clearCreateError();
  }
}
