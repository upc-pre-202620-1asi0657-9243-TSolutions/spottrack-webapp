import { Routes } from '@angular/router';

export const equipmentRoutes: Routes = [
  {
    path: 'equipments',
    loadComponent: () =>
      import('./equipment-management/equipment-management').then(
        m => m.EquipmentManagementComponent
      ),
  },
  {
    path: 'equipments/new',
    loadComponent: () =>
      import('./add-equipment-dialog/add-equipment-dialog').then(
        m => m.AddEquipmentDialogComponent
      ),
  },
  {
    path: 'equipments/:id/edit',
    loadComponent: () =>
      import('./add-equipment-dialog/add-equipment-dialog').then(
        m => m.AddEquipmentDialogComponent
      ),
  },
];
