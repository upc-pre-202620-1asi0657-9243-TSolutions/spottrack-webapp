import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoutineSessionResource } from './routines-response';
import { RoutineSession } from '../domain/model/routine-session.entity';
import { RoutineSessionAssembler } from './routine-session-assembler';

@Injectable({ providedIn: 'root' })
export class RoutineSessionsApi {
  private readonly sessionsUrl = `${environment.apiBase}/routine-sessions`;
  private readonly sessionAssembler = new RoutineSessionAssembler();

  constructor(private readonly http: HttpClient) {}

  getSessions(): Observable<RoutineSession[]> {
    return this.http.get<RoutineSessionResource[]>(this.sessionsUrl).pipe(
      map(resources => this.sessionAssembler.toEntitiesFromResponse(resources))
    );
  }

  startSession(routineId: number): Observable<RoutineSession> {
    return this.http.post<RoutineSessionResource>(this.sessionsUrl, { routineId }).pipe(
      map(resource => this.sessionAssembler.toEntityFromResource(resource))
    );
  }

  completeSession(sessionId: number): Observable<RoutineSession> {
    return this.http.post<RoutineSessionResource>(`${this.sessionsUrl}/${sessionId}/completions`, {}).pipe(
      map(resource => this.sessionAssembler.toEntityFromResource(resource))
    );
  }

  markMissed(sessionId: number): Observable<RoutineSession> {
    return this.http.post<RoutineSessionResource>(`${this.sessionsUrl}/${sessionId}/missed`, {}).pipe(
      map(resource => this.sessionAssembler.toEntityFromResource(resource))
    );
  }

  setExerciseCompletion(sessionId: number, exerciseBlockId: number, completed: boolean): Observable<RoutineSession> {
    return this.http.patch<RoutineSessionResource>(
      `${this.sessionsUrl}/${sessionId}/exercise-blocks/${exerciseBlockId}`,
      { completed }
    ).pipe(
      map(resource => this.sessionAssembler.toEntityFromResource(resource))
    );
  }
}
