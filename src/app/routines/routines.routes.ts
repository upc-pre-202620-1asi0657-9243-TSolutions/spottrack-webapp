import { Routes } from '@angular/router';

export const routinesRoutes: Routes = [
  {
    path: 'routines',
    loadComponent: () =>
      import('./presentation/views/routine-list/routine-list.component').then(
        m => m.RoutineListComponent
      ),
  },
  {
    path: 'routines/:id',
    loadComponent: () =>
      import('./presentation/views/routine-detail/routine-detail.component').then(
        m => m.RoutineDetailComponent
      ),
  },
];
