import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class BranchAccess implements BaseEntity {
  private _id:         number;
  private _planId:     number;
  private _branchId:   number;
  private _branchName: string;
  private _accessType: 'FULL' | 'LIMITED' | 'RESTRICTED';
  private _startDate:  string;
  private _endDate:    string | null;

  constructor(props: {
    id:         number;
    planId:     number;
    branchId:   number;
    branchName: string;
    accessType: 'FULL' | 'LIMITED' | 'RESTRICTED';
    startDate:  string;
    endDate:    string | null;
  }) {
    this._id         = props.id;
    this._planId     = props.planId;
    this._branchId   = props.branchId;
    this._branchName = props.branchName;
    this._accessType = props.accessType;
    this._startDate  = props.startDate;
    this._endDate    = props.endDate;
  }

  get id():         number                        { return this._id; }
  set id(v: number)                               { this._id = v; }
  get planId():     number                        { return this._planId; }
  get branchId():   number                        { return this._branchId; }
  get branchName(): string                        { return this._branchName; }
  get accessType(): 'FULL' | 'LIMITED' | 'RESTRICTED' { return this._accessType; }
  get startDate():  string                        { return this._startDate; }
  get endDate():    string | null                 { return this._endDate; }

  get isActive(): boolean { return this._endDate === null || new Date(this._endDate) > new Date(); }
}
