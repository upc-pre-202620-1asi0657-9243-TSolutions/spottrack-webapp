import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class SensorReading implements BaseEntity {
  private _id:        number;
  private _sessionId: number;
  private _value:     number;
  private _unit:      string;
  private _timestamp: string;

  constructor(props: {
    id:        number;
    sessionId: number;
    value:     number;
    unit:      string;
    timestamp: string;
  }) {
    this._id        = props.id;
    this._sessionId = props.sessionId;
    this._value     = props.value;
    this._unit      = props.unit;
    this._timestamp = props.timestamp;
  }

  get id():        number { return this._id; }
  set id(v: number)       { this._id = v; }
  get sessionId(): number { return this._sessionId; }
  get value():     number { return this._value; }
  get unit():      string { return this._unit; }
  get timestamp(): string { return this._timestamp; }
}
