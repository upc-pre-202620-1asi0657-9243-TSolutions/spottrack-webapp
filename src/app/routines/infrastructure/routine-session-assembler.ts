import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { RoutineSession, RoutineSessionStatus } from '../domain/model/routine-session.entity';
import { RoutineSessionResource, RoutineSessionResponse } from './routines-response';

export class RoutineSessionAssembler implements BaseAssembler<RoutineSession, RoutineSessionResource, RoutineSessionResponse> {

  toEntitiesFromResponse(response: RoutineSessionResponse): RoutineSession[] {
    return response.map(r => this.toEntityFromResource(r));
  }

  toEntityFromResource(r: RoutineSessionResource): RoutineSession {
    return new RoutineSession({
      id:        r.id,
      routineId: r.routineId,
      clientId:  r.clientId,
      status:    r.status as RoutineSessionStatus,
      startedAt: r.startedAt,
      completedExerciseBlockIds: r.completedExerciseBlockIds ?? [],
    });
  }

  toResourceFromEntity(e: RoutineSession): RoutineSessionResource {
    return {
      id:        e.id,
      routineId: e.routineId,
      clientId:  e.clientId,
      status:    e.status,
      startedAt: e.startedAt,
      completedExerciseBlockIds: e.completedExerciseBlockIds,
    };
  }
}
