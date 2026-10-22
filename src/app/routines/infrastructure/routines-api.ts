import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoutineResource, ExerciseBlockResource } from './routines-response';
import { Routine } from '../domain/model/routine.entity';
import { RoutineAssembler } from './routine-assembler';
import { ExerciseBlock } from '../domain/model/exercise-block.entity';
import { ExerciseBlockAssembler } from './exercise-block-assembler';

@Injectable({ providedIn: 'root' })
export class RoutinesApi {
  private readonly routinesUrl = `${environment.apiBase}/routines`;
  private readonly routineAssembler       = new RoutineAssembler();
  private readonly exerciseBlockAssembler = new ExerciseBlockAssembler();

  constructor(private readonly http: HttpClient) {}

  getRoutines(): Observable<Routine[]> {
    return this.http.get<RoutineResource[]>(this.routinesUrl).pipe(
      map(resources => this.routineAssembler.toEntitiesFromResponse(resources))
    );
  }

  createRoutine(routineName: string): Observable<Routine> {
    return this.http.post<RoutineResource>(this.routinesUrl, { routineName }).pipe(
      map(resource => this.routineAssembler.toEntityFromResource(resource))
    );
  }

  getExerciseBlocks(routineId: number): Observable<ExerciseBlock[]> {
    return this.http.get<ExerciseBlockResource[]>(`${this.routinesUrl}/${routineId}/exercise-blocks`).pipe(
      map(resources => this.exerciseBlockAssembler.toEntitiesFromResponse(resources))
    );
  }

  addExerciseBlock(routineId: number, exerciseName: string, exerciseType: string, order: number, sets: number, reps: number): Observable<ExerciseBlock> {
    return this.http.post<ExerciseBlockResource>(`${this.routinesUrl}/${routineId}/exercise-blocks`, {
      routineId, exerciseName, exerciseType, order, sets, reps,
    }).pipe(
      map(resource => this.exerciseBlockAssembler.toEntityFromResource(resource))
    );
  }
}
