import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { RoutinesApi } from '../../../infrastructure/routines-api';
import { ExerciseBlock, ExerciseType } from '../../../domain/model/exercise-block.entity';
import { RoutinesStore } from '../../../application/routines.store';
import { RoutineSessionsStore } from '../../../application/routine-sessions.store';

@Component({
  selector: 'app-routine-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, RouterLink],
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

  ngOnInit(): void {
    if (!this.routineId) return;
    this.loadBlocks();
  }

  loadBlocks(): void {
    this.loading.set(true);
    this.api.getExerciseBlocks(this.routineId).subscribe({
      next: blocks => { this.blocks.set(blocks); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

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
      error: () => this.blockError.set('No se pudo agregar el ejercicio'),
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
