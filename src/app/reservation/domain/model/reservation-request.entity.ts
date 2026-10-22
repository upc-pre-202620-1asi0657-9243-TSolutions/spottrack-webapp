import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum ReservationRequestStatus {
  PENDING               = 'PENDING',
  SUBMITTED             = 'SUBMITTED',
  ALTERNATIVE_REQUESTED = 'ALTERNATIVE_REQUESTED',
  AVAILABLE_REQUESTED   = 'AVAILABLE_REQUESTED',
}

export class ReservationRequest implements BaseEntity {
  private _id:          number;
  private _uuid:        string;
  private _clientId:    number;
  private _equipmentId: string;
  private _status:      ReservationRequestStatus;
  private _requestedAt: string;

  constructor(props: {
    id:          number;
    uuid:        string;
    clientId:    number;
    equipmentId: string;
    status:      ReservationRequestStatus;
    requestedAt: string;
  }) {
    this._id          = props.id;
    this._uuid        = props.uuid;
    this._clientId    = props.clientId;
    this._equipmentId = props.equipmentId;
    this._status      = props.status;
    this._requestedAt = props.requestedAt;
  }

  get id():          number                    { return this._id; }
  set id(v: number)                            { this._id = v; }
  get uuid():        string                    { return this._uuid; }
  get clientId():    number                    { return this._clientId; }
  get equipmentId(): string                    { return this._equipmentId; }
  get status():      ReservationRequestStatus  { return this._status; }
  get requestedAt(): string                    { return this._requestedAt; }

  get isPending():              boolean { return this._status === ReservationRequestStatus.PENDING; }
  get isSubmitted():            boolean { return this._status === ReservationRequestStatus.SUBMITTED; }
  get isAlternativeRequested(): boolean { return this._status === ReservationRequestStatus.ALTERNATIVE_REQUESTED; }
  get isAvailableRequested():   boolean { return this._status === ReservationRequestStatus.AVAILABLE_REQUESTED; }
}
