import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../../auth/application/auth.store';
import { AdminGymStore } from '../../../../gym/application/admin-gym.store';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile {
  private authStore    = inject(AuthStore);
  private adminGymStore = inject(AdminGymStore);

  readonly currentUser = this.authStore.currentUser;

  readonly primaryGymName = computed(() =>
    this.authStore.isAdmin() ? (this.adminGymStore.primaryGym()?.name ?? null) : null
  );

  get initials(): string {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }
}
