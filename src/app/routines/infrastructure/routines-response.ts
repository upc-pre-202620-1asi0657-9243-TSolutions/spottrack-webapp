import { BaseResource } from '../../shared/infrastructure/base-response';

export interface RoutineResource extends BaseResource {
  id:                 number;
  routineName:        string;
  clientId:           number;
  exerciseBlockCount: number;
}

export type RoutineResponse = RoutineResource[];

export interface ExerciseBlockResource extends BaseResource {
  id:           number;
  exerciseName: string;
  exerciseType: 'CARDIO' | 'STRENGTH' | 'FLEXIBILITY';
  order:        number;
  sets:         number;
  reps:         number;
}

export type ExerciseBlockResponse = ExerciseBlockResource[];

export interface RoutineSessionResource extends BaseResource {
  id:                      number;
  routineId:               number;
  clientId:                number;
  status:                  'STARTED' | 'COMPLETED' | 'MISSED';
  startedAt:               string;
  completedExerciseBlockIds: number[];
}

export type RoutineSessionResponse = RoutineSessionResource[];
