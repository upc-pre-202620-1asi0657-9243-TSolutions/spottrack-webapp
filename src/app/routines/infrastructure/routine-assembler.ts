import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Routine } from '../domain/model/routine.entity';
import { RoutineResource, RoutineResponse } from './routines-response';

export class RoutineAssembler implements BaseAssembler<Routine, RoutineResource, RoutineResponse> {

  toEntitiesFromResponse(response: RoutineResponse): Routine[] {
    return response.map(r => this.toEntityFromResource(r));
  }

  toEntityFromResource(r: RoutineResource): Routine {
    return new Routine({
      id:                 r.id,
      routineName:        r.routineName,
      clientId:           r.clientId,
      exerciseBlockCount: r.exerciseBlockCount,
    });
  }

  toResourceFromEntity(e: Routine): RoutineResource {
    return {
      id:                 e.id,
      routineName:        e.routineName,
      clientId:           e.clientId,
      exerciseBlockCount: e.exerciseBlockCount,
    };
  }
}
