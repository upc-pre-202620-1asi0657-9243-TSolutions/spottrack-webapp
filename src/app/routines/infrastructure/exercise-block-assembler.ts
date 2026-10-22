import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { ExerciseBlock, ExerciseType } from '../domain/model/exercise-block.entity';
import { ExerciseBlockResource, ExerciseBlockResponse } from './routines-response';

export class ExerciseBlockAssembler implements BaseAssembler<ExerciseBlock, ExerciseBlockResource, ExerciseBlockResponse> {

  toEntitiesFromResponse(response: ExerciseBlockResponse): ExerciseBlock[] {
    return response.map(r => this.toEntityFromResource(r));
  }

  toEntityFromResource(r: ExerciseBlockResource): ExerciseBlock {
    return new ExerciseBlock({
      id:           r.id,
      exerciseName: r.exerciseName,
      exerciseType: r.exerciseType as ExerciseType,
      order:        r.order,
      sets:         r.sets,
      reps:         r.reps,
    });
  }

  toResourceFromEntity(e: ExerciseBlock): ExerciseBlockResource {
    return {
      id:           e.id,
      exerciseName: e.exerciseName,
      exerciseType: e.exerciseType,
      order:        e.order,
      sets:         e.sets,
      reps:         e.reps,
    };
  }
}
