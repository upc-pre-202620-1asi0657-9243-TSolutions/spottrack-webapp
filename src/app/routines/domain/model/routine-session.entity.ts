import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum RoutineSessionStatus {
  STARTED   = 'STARTED',
  COMPLETED = 'COMPLETED',
  MISSED    = 'MISSED',
}

export class RoutineSession implements BaseEntity {
  private _id:        number;
  private _routineId: number;
  private _clientId:  number;
  private _status:    RoutineSessionStatus;
  private _startedAt: string;
  private _completedExerciseBlockIds: number[];

  constructor(props: {
    id:        number;
    routineId: number;
    clientId:  number;
    status:    RoutineSessionStatus;
    startedAt: string;
    completedExerciseBlockIds: number[];
  }) {
    this._id        = props.id;
    this._routineId = props.routineId;
    this._clientId  = props.clientId;
    this._status    = props.status;
    this._startedAt = props.startedAt;
    this._completedExerciseBlockIds = props.completedExerciseBlockIds;
  }

  get id():        number               { return this._id; }
  get routineId(): number               { return this._routineId; }
  get clientId():  number               { return this._clientId; }
  get status():    RoutineSessionStatus { return this._status; }
  get startedAt(): string               { return this._startedAt; }
  get completedExerciseBlockIds(): number[] { return this._completedExerciseBlockIds; }

  isBlockCompleted(exerciseBlockId: number): boolean {
    return this._completedExerciseBlockIds.includes(exerciseBlockId);
  }
}
