import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminGymStore } from '../../../application/admin-gym.store';

@Component({
  selector: 'app-gym-create',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule],
  templateUrl: './gym-create.html',
  styleUrl:    './gym-create.scss',
})
export class GymCreateComponent {
  private readonly router = inject(Router);
  readonly store          = inject(AdminGymStore);

  readonly gymName  = signal('');
  private submitted = signal(false);

  constructor() {
    effect(() => {
      if (this.submitted() && !this.store.createLoading() && !this.store.createError()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  submit(): void {
    const name = this.gymName().trim();
    if (!name) return;
    this.submitted.set(true);
    this.store.create(name);
  }
}
