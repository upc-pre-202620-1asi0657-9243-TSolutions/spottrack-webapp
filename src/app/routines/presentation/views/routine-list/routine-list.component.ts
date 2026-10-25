import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { RoutinesStore } from '../../../application/routines.store';
import { RoutineSessionsStore } from '../../../application/routine-sessions.store';
import { Routine } from '../../../domain/model/routine.entity';
import { RoutineSession, RoutineSessionStatus } from '../../../domain/model/routine-session.entity';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';

export type RoutineFilter = 'all' | 'active' | 'new';

/** Everything a routine card shows, derived once from the routine and its sessions. */
interface RoutineCard {
  routine:       Routine;
  active:        RoutineSession | null;
  completed:     number;
  lastTrainedAt: string | null;
  progressPct:   number;
}

interface WeekDay {
  date:      Date;
  completed: number;
  missed:    number;
  isToday:   boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-routine-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
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
  readonly loading     = this.store.loading;
  readonly error       = this.store.error;

  readonly filter = signal<RoutineFilter>('all');
  readonly filters: RoutineFilter[] = ['all', 'active', 'new'];

  readonly suggestions = ['upper', 'lower', 'full', 'cardio'];

  showModal = signal(false);
  routineName = '';

  private readonly sessionsByRoutine = computed(() => {
    const map = new Map<number, RoutineSession[]>();
    for (const s of this.sessionsStore.sessions()) {
      const list = map.get(s.routineId) ?? [];
      list.push(s);
      map.set(s.routineId, list);
    }
    return map;
  });

  private readonly allCards = computed(() => this.store.filteredRoutines().map(r => this.toCard(r)));

  readonly cards = computed(() => {
    const f = this.filter();
    return this.allCards().filter(c => f === 'all' || (f === 'active' ? !!c.active : !c.lastTrainedAt));
  });

  readonly filterCount = computed<Record<RoutineFilter, number>>(() => ({
    all:    this.allCards().length,
    active: this.allCards().filter(c => !!c.active).length,
    new:    this.allCards().filter(c => !c.lastTrainedAt).length,
  }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  readonly totalExercises = computed(() =>
    this.store.routines().reduce((sum, r) => sum + r.exerciseBlockCount, 0)
  );

  readonly completedSessions = computed(() =>
    this.sessionsStore.sessions().filter(s => s.status === RoutineSessionStatus.COMPLETED).length
  );

  /** Completed vs. missed — sessions still running don't count yet. */
  readonly completionRate = computed(() => {
    const closed = this.sessionsStore.sessions().filter(s => s.status !== RoutineSessionStatus.STARTED);
    if (!closed.length) return null;
    return Math.round((closed.filter(s => s.status === RoutineSessionStatus.COMPLETED).length / closed.length) * 100);
  });

  // ── Last 7 days ───────────────────────────────────────────────────────────
  readonly week = computed<WeekDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
      date:      new Date(today.getTime() - (6 - i) * DAY_MS),
      completed: 0,
      missed:    0,
      isToday:   i === 6,
    }));
    for (const s of this.sessionsStore.sessions()) {
      const d = new Date(s.startedAt);
      d.setHours(0, 0, 0, 0);
      const idx = 6 - Math.round((today.getTime() - d.getTime()) / DAY_MS);
      if (idx < 0 || idx > 6) continue;
      if (s.status === RoutineSessionStatus.COMPLETED) days[idx].completed++;
      if (s.status === RoutineSessionStatus.MISSED) days[idx].missed++;
    }
    return days;
  });

  readonly weekCompleted  = computed(() => this.week().reduce((sum, d) => sum + d.completed, 0));
  readonly weekActiveDays = computed(() => this.week().filter(d => d.completed > 0).length);

  onSearch(event: Event): void { this.searchQuery.set((event.target as HTMLInputElement).value); }

  openModal(): void { this.routineName = ''; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }

  useSuggestion(name: string): void { this.routineName = name; }

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

  /** Cycles a small palette so the grid doesn't read as one block of amber. */
  tone(index: number): string {
    return ['amber', 'blue', 'teal', 'green'][index % 4];
  }

  private toCard(routine: Routine): RoutineCard {
    const sessions = this.sessionsByRoutine().get(routine.id) ?? [];
    const active   = sessions.find(s => s.status === RoutineSessionStatus.STARTED) ?? null;
    const last     = sessions.reduce<string | null>((max, s) => (!max || s.startedAt > max ? s.startedAt : max), null);
    const total    = routine.exerciseBlockCount;
    return {
      routine,
      active,
      completed:     sessions.filter(s => s.status === RoutineSessionStatus.COMPLETED).length,
      lastTrainedAt: last,
      progressPct:   active && total ? Math.round((active.completedExerciseBlockIds.length / total) * 100) : 0,
    };
  }
}
