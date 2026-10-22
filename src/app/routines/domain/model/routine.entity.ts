import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class Routine implements BaseEntity {
  private _id:                 number;
  private _routineName:        string;
  private _clientId:           number;
  private _exerciseBlockCount: number;

  constructor(props: {
    id:                 number;
    routineName:        string;
    clientId:           number;
    exerciseBlockCount: number;
  }) {
    this._id                 = props.id;
    this._routineName        = props.routineName;
    this._clientId           = props.clientId;
    this._exerciseBlockCount = props.exerciseBlockCount;
  }

  get id():                 number { return this._id; }
  get routineName():        string { return this._routineName; }
  get clientId():           number { return this._clientId; }
  get exerciseBlockCount(): number { return this._exerciseBlockCount; }
}
