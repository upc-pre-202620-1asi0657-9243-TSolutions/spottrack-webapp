import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { RoutinesApi } from '../../../infrastructure/routines-api';
import { ExerciseBlock, ExerciseType } from '../../../domain/model/exercise-block.entity';
import { RoutineSessionStatus } from '../../../domain/model/routine-session.entity';
import { RoutinesStore } from '../../../application/routines.store';
import { RoutineSessionsStore } from '../../../application/routine-sessions.store';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

const TYPE_ICONS: Record<ExerciseType, string> = {
  [ExerciseType.CARDIO]:      'directions_run',
  [ExerciseType.STRENGTH]:    'fitness_center',
  [ExerciseType.FLEXIBILITY]: 'self_improvement',
};

@Component({
  selector: 'app-routine-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, RouterLink, PaginatorComponent],
  templateUrl: './routine-detail.component.html',
  styleUrl: './routine-detail.component.css',
})
export class RoutineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api   = inject(RoutinesApi);
  readonly store         = inject(RoutinesStore);
  readonly sessionsStore = inject(RoutineSessionsStore);

  readonly blocks     = signal<ExerciseBlock[]>([]);
  readonly loading    = signal(false);
  readonly blockError = signal<string | null>(null);

  readonly exerciseTypes = Object.values(ExerciseType);

  showAddBlock = signal(false);
  newExerciseName = '';
  newExerciseType: ExerciseType = ExerciseType.STRENGTH;
  newSets = 3;
  newReps = 10;

  readonly historyPage     = signal(0);
  readonly historyPageSize = signal(5);

  get routineId(): number { return Number(this.route.snapshot.paramMap.get('id')); }

  get routine() {
    return this.store.routines().find(r => r.id === this.routineId) ?? null;
  }

  readonly activeSession        = computed(() => this.sessionsStore.activeSessionByRoutine().get(this.routineId));
  readonly sessionActionLoading = this.sessionsStore.actionLoading;
  readonly sessionActionError   = this.sessionsStore.actionError;

  readonly routineSessions = computed(() =>
    this.sessionsStore.sessions()
      .filter(s => s.routineId === this.routineId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  );

  readonly pagedSessions = computed(() =>
    paginate(this.routineSessions(), this.historyPage(), this.historyPageSize())
  );

  readonly completedCount = computed(() =>
    this.routineSessions().filter(s => s.status === RoutineSessionStatus.COMPLETED).length
  );

  readonly lastTrainedAt = computed(() => this.routineSessions()[0]?.startedAt ?? null);

  readonly totalSets = computed(() => this.blocks().reduce((sum, b) => sum + b.sets, 0));
  readonly totalReps = computed(() => this.blocks().reduce((sum, b) => sum + b.sets * b.reps, 0));

  /** Share of exercises per type, for the breakdown bars. */
  readonly typeBreakdown = computed(() => {
    const total = this.blocks().length;
    return this.exerciseTypes.map(type => {
      const count = this.blocks().filter(b => b.exerciseType === type).length;
      return { type, count, pct: total ? Math.round((count / total) * 100) : 0 };
    });
  });

  readonly doneCount = computed(() => {
    const session = this.activeSession();
    return session ? this.blocks().filter(b => session.isBlockCompleted(b.id)).length : 0;
  });

  readonly progressPct = computed(() =>
    this.blocks().length ? Math.round((this.doneCount() / this.blocks().length) * 100) : 0
  );

  ngOnInit(): void {
    if (!this.routineId) return;
    this.loadBlocks();
  }

  loadBlocks(): void {
    this.loading.set(true);
    this.api.getExerciseBlocks(this.routineId).subscribe({
      next: blocks => { this.blocks.set([...blocks].sort((a, b) => a.order - b.order)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  typeIcon(type: ExerciseType): string { return TYPE_ICONS[type] ?? 'fitness_center'; }

  openAddBlock(): void {
    this.newExerciseName = '';
    this.newExerciseType = ExerciseType.STRENGTH;
    this.newSets = 3;
    this.newReps = 10;
    this.blockError.set(null);
    this.showAddBlock.set(true);
  }

  closeAddBlock(): void { this.showAddBlock.set(false); }

  submitAddBlock(): void {
    const name = this.newExerciseName.trim();
    if (!name || this.newSets <= 0 || this.newReps <= 0) return;
    const order = this.blocks().length + 1;
    this.api.addExerciseBlock(this.routineId, name, this.newExerciseType, order, this.newSets, this.newReps).subscribe({
      next: () => { this.closeAddBlock(); this.loadBlocks(); },
      error: () => this.blockError.set('routines.detail.addBlock.error'),
    });
  }

  startSession(): void {
    this.sessionsStore.start(this.routineId);
  }

  completeSession(): void {
    const session = this.activeSession();
    if (session) this.sessionsStore.complete(session.id);
  }

  markMissed(): void {
    const session = this.activeSession();
    if (session) this.sessionsStore.markMissed(session.id);
  }

  isBlockCompleted(exerciseBlockId: number): boolean {
    return this.activeSession()?.isBlockCompleted(exerciseBlockId) ?? false;
  }

  toggleBlockCompletion(exerciseBlockId: number): void {
    const session = this.activeSession();
    if (!session) return;
    this.sessionsStore.setExerciseCompletion(session.id, exerciseBlockId, !session.isBlockCompleted(exerciseBlockId));
  }
}
