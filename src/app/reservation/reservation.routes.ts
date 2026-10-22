import { Routes } from '@angular/router';

export const reservationRoutes: Routes = [
  {
    path: 'bookings',
    loadComponent: () =>
      import('./presentation/views/reservation-list/reservation-list.component').then(
        m => m.ReservationListComponent
      ),
  },
  {
    path: 'bookings/new',
    loadComponent: () =>
      import('./presentation/views/reservation-form/reservation-form.component').then(
        m => m.ReservationFormComponent
      ),
  },
];
