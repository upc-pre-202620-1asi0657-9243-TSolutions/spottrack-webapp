import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ActiveGymStore } from '../../../application/active-gym.store';
import { GymListStore } from '../../../../gym/application/gym-list.store';

@Component({
  selector: 'app-gym-associate',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './gym-associate.html',
  styleUrl:    './gym-associate.scss',
})
export class GymAssociateComponent {
  private readonly router = inject(Router);
  readonly activeGymStore = inject(ActiveGymStore);
  readonly gymListStore   = inject(GymListStore);

  // Snapshot at construction: true means the user arrived with no active gym
  // (interceptor redirect), so we send them to /map after the first join.
  // False means they already had a gym and navigated here manually to add another —
  // in that case we stay on the page and show the updated state.
  private readonly redirectAfterJoin = this.activeGymStore.hasNoActiveGym();

  readonly joiningGymId = signal<string | null>(null);

  constructor() {
    this.gymListStore.load();
    this.activeGymStore.clearAssociateError();

    effect(() => {
      const joining = this.joiningGymId();
      if (joining && this.activeGymStore.associations().some(a => a.gymId === joining)) {
        if (this.redirectAfterJoin) {
          this.router.navigate(['/map']);
        } else {
          this.joiningGymId.set(null);
        }
      }
    });
  }

  isAssociated(gymId: string): boolean {
    return this.activeGymStore.associations().some(a => a.gymId === gymId);
  }

  joinGym(gymId: string): void {
    this.activeGymStore.clearAssociateError();
    this.joiningGymId.set(gymId);
    this.activeGymStore.associateToGym(gymId);
  }
}
