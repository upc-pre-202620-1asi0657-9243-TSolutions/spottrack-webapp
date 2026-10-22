import { Injectable, inject, signal, effect } from '@angular/core';
import { AuthStore } from '../../auth/application/auth.store'; // Verifica la ruta
import { UserRole } from '../../auth/domain/model/user.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private authStore = inject(AuthStore);

  // Usamos un signal privado para control interno
  private roleSignal = signal<'admin' | 'client'>('admin');

  // Exponemos el rol como lectura para los componentes
  currentRole = this.roleSignal.asReadonly();

  constructor() {
    // EFECTO DINÁMICO: Se dispara automáticamente cuando cambia currentUser()
    effect(() => {
      const user = this.authStore.currentUser();
      if (user) {
        // Mapeamos el UserRole del backend/store al string que usa tu UI
        const mappedRole = user.role === UserRole.ADMIN ? 'admin' : 'client';
        this.roleSignal.set(mappedRole);
      }
    });
  }

  // Mantenemos el toggle para tus pruebas manuales con el botón "Swap"
  toggleRole() {
    this.roleSignal.update((role) => (role === 'admin' ? 'client' : 'admin'));
  }
}
