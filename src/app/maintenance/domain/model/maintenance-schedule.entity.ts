import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum TaskType {
  PREVENTIVE  = 'PREVENTIVE',
  LUBRICATION = 'LUBRICATION',
  INSPECTION  = 'INSPECTION',
  OVERHAUL    = 'OVERHAUL',
}

export enum ScheduleStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class MaintenanceSchedule implements BaseEntity {
  private _id:             number;
  private _equipmentId:    number;
  private _scheduledDate:  string;
  private _scheduledTime:  string;
  private _taskType:       TaskType;
  private _notes:          string;
  private _status:         ScheduleStatus;

  constructor(props: {
    id:            number;
    equipmentId:   number;
    scheduledDate: string;
    scheduledTime: string;
    taskType:      TaskType;
    notes:         string;
    status:        ScheduleStatus;
  }) {
    this._id            = props.id;
    this._equipmentId   = props.equipmentId;
    this._scheduledDate = props.scheduledDate;
    this._scheduledTime = props.scheduledTime;
    this._taskType      = props.taskType;
    this._notes         = props.notes;
    this._status        = props.status;
  }

  get id():            number         { return this._id; }
  set id(v:            number)        { this._id = v; }
  get equipmentId():   number         { return this._equipmentId; }
  get scheduledDate(): string         { return this._scheduledDate; }
  get scheduledTime(): string         { return this._scheduledTime; }
  get taskType():      TaskType       { return this._taskType; }
  get notes():         string         { return this._notes; }
  get status():        ScheduleStatus { return this._status; }
}
