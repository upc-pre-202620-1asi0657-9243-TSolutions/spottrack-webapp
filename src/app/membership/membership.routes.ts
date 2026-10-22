import { Routes } from '@angular/router';

export const membershipRoutes: Routes = [
  {
    path: 'membership',
    loadComponent: () =>
      import('./presentation/views/membership-list/membership-list.component').then(
        m => m.MembershipListComponent
      ),
  },
];
