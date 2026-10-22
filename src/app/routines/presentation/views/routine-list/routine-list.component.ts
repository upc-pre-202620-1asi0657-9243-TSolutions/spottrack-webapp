import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { RoutinesStore } from '../../../application/routines.store';
import { RoutineSessionsStore } from '../../../application/routine-sessions.store';
import { Routine } from '../../../domain/model/routine.entity';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';

@Component({
  selector: 'app-routine-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    ContextMenuDirective,
  ],
  templateUrl: './routine-list.component.html',
  styleUrl: './routine-list.component.css',
})
export class RoutineListComponent {
  readonly store         = inject(RoutinesStore);
  readonly sessionsStore = inject(RoutineSessionsStore);

  readonly searchQuery = this.store.searchQuery;
  readonly routines    = this.store.filteredRoutines;
  readonly loading     = this.store.loading;
  readonly error       = this.store.error;

  showModal = signal(false);
  routineName = '';

  onSearch(event: Event): void { this.searchQuery.set((event.target as HTMLInputElement).value); }

  hasActiveSession(routine: Routine): boolean {
    return this.sessionsStore.activeSessionByRoutine().has(routine.id);
  }

  openModal(): void { this.routineName = ''; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }

  routineMenu(r: Routine): ContextMenuItem[] {
    return [
      { label: 'New routine',        icon: 'add',          action: () => this.openModal() },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'Copy routine name',  icon: 'content_copy', action: () => navigator.clipboard.writeText(r.routineName) },
    ];
  }

  createRoutine(): void {
    const name = this.routineName.trim();
    if (!name) return;
    this.store.createRoutine(name);
    this.closeModal();
  }
}
