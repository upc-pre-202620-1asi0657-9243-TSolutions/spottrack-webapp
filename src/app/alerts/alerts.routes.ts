import { Routes } from '@angular/router';

export const alertsRoutes: Routes = [
  {
    path: 'alerts',
    loadComponent: () =>
      import('./presentation/views/alert-inbox/alert-inbox.component').then(
        m => m.AlertInboxComponent
      ),
  },
  {
    path: 'alerts/:id',
    loadComponent: () =>
      import('./presentation/views/alert-detail/alert-detail.component').then(
        m => m.AlertDetailComponent
      ),
  },
];
