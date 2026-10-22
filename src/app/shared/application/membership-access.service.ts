import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

// Single source of truth for membership access-denial routing.
// The http-error interceptor delegates here; future sub-branches update only this file
// when the real screens for each case are built.
@Injectable({ providedIn: 'root' })
export class MembershipAccessService {
  private readonly router = inject(Router);

  handleAccessDenied(code: string): void {
    switch (code) {
      case 'membership.error.access.noGym':
        this.router.navigate(['/gym/associate']);
        break;
      case 'membership.error.access.suspended':
        this.router.navigate(['/membership']);
        break;
      case 'membership.error.access.inactive':
        this.router.navigate(['/membership']);
        break;
      // Unknown codes: fall through — the store's errorSignal handles display
    }
  }
}
