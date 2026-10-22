import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { WhitelistStore } from '../../../application/whitelist.store';

@Component({
  selector: 'app-gym-whitelist',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule],
  templateUrl: './gym-whitelist.html',
  styleUrl:    './gym-whitelist.scss',
})
export class GymWhitelistComponent {
  readonly adminGymStore  = inject(AdminGymStore);
  readonly whitelistStore = inject(WhitelistStore);

  dniInput = '';
  readonly dniFormatError = signal<string | null>(null);

  readonly gymId = computed(() => this.adminGymStore.primaryGym()?.gymId ?? null);

  constructor() {
    this.adminGymStore.load();

    // Load whitelist as soon as the admin's gym resolves.
    effect(() => {
      const id = this.gymId();
      if (id) this.whitelistStore.load(id);
    });
  }

  addDni(): void {
    const dni = this.dniInput.trim();
    this.dniFormatError.set(null);
    this.whitelistStore.clearAddError();

    if (!/^[0-9]{8}$/.test(dni)) {
      this.dniFormatError.set('whitelist.error.invalidFormat');
      return;
    }

    const id = this.gymId();
    if (!id) return;

    this.dniInput = '';
    this.whitelistStore.addDni(id, dni);
  }

  removeDni(dni: string): void {
    const id = this.gymId();
    if (!id) return;
    this.whitelistStore.removeDni(id, dni);
  }

  onDniInputChange(): void {
    this.dniFormatError.set(null);
    this.whitelistStore.clearAddError();
  }
}
