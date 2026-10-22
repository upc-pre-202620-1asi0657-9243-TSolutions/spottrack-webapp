import { Component, computed, effect, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ActiveGymStore } from '../../../application/active-gym.store';
import { GymListStore } from '../../../../gym/application/gym-list.store';

@Component({
  selector: 'app-gym-switcher',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './gym-switcher.html',
  styleUrl: './gym-switcher.scss',
})
export class GymSwitcherComponent {
  readonly activeGymStore = inject(ActiveGymStore);
  readonly gymListStore   = inject(GymListStore);

  readonly showAddPanel  = signal(false);
  readonly joiningGymId  = signal<string | null>(null);

  // Gyms not yet associated with this client.
  readonly joinableGyms = computed(() => {
    const associatedIds = new Set(this.activeGymStore.associations().map(a => a.gymId));
    return this.gymListStore.gyms().filter(g => !associatedIds.has(g.gymId));
  });

  constructor() {
    // When the pending join lands in associations, clear the spinner and close
    // the add panel — no need for a success signal in the store.
    effect(() => {
      const joining = this.joiningGymId();
      const landed  = joining && this.activeGymStore.associations().some(a => a.gymId === joining);
      if (landed) {
        this.joiningGymId.set(null);
        this.showAddPanel.set(false);
      }
    });
  }

  switchGym(gymId: string): void {
    if (this.activeGymStore.activeGym()?.gymId === gymId) return;
    this.activeGymStore.clearError();
    this.activeGymStore.switchActiveGym(gymId);
  }

  openAddPanel(): void {
    this.gymListStore.load();
    this.activeGymStore.clearAssociateError();
    this.showAddPanel.set(true);
  }

  closeAddPanel(): void {
    this.showAddPanel.set(false);
    this.joiningGymId.set(null);
    this.activeGymStore.clearAssociateError();
  }

  joinGym(gymId: string): void {
    this.joiningGymId.set(gymId);
    this.activeGymStore.clearAssociateError();
    this.activeGymStore.associateToGym(gymId);
  }

  gymName(gymId: string): string {
    if (this.gymListStore.loading()) return '…';
    return this.gymListStore.gyms().find(g => g.gymId === gymId)?.name ?? '—';
  }
}
