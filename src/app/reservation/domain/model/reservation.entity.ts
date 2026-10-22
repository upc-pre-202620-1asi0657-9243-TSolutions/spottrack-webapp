import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum ReservationStatus {
  ACTIVE    = 'ACTIVE',
  EXPIRED   = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  ENDED     = 'ENDED',
}

export class Reservation implements BaseEntity {
  private _id:             number;
  private _uuid:           string;
  private _clientId:       number;
  private _equipmentId:    string;
  private _status:         ReservationStatus;
  private _startedAt:      string;
  private _timerExpiry:    string | null;
  private _startTime:      string;
  private _endTime:        string;

  constructor(props: {
    id:          number;
    uuid:        string;
    clientId:    number;
    equipmentId: string;
    status:      ReservationStatus;
    startedAt:   string;
    timerExpiry: string | null;
    startTime:   string;
    endTime:     string;
  }) {
    this._id          = props.id;
    this._uuid        = props.uuid;
    this._clientId    = props.clientId;
    this._equipmentId = props.equipmentId;
    this._status      = props.status;
    this._startedAt   = props.startedAt;
    this._timerExpiry = props.timerExpiry;
    this._startTime   = props.startTime;
    this._endTime     = props.endTime;
  }

  get id():          number            { return this._id; }
  set id(v: number)                   { this._id = v; }
  get uuid():        string            { return this._uuid; }
  get clientId():    number            { return this._clientId; }
  get equipmentId(): string            { return this._equipmentId; }
  get status():      ReservationStatus { return this._status; }
  get startedAt():   string            { return this._startedAt; }
  get timerExpiry(): string | null     { return this._timerExpiry; }
  get startTime():   string            { return this._startTime; }
  get endTime():     string            { return this._endTime; }

  get isActive():    boolean { return this._status === ReservationStatus.ACTIVE; }
  get isExpired():   boolean { return this._status === ReservationStatus.EXPIRED; }
  get isCancelled(): boolean { return this._status === ReservationStatus.CANCELLED; }
  get isEnded():     boolean { return this._status === ReservationStatus.ENDED; }
}
