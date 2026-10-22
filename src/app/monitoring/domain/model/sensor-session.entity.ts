import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class SensorSession implements BaseEntity {
  private _id:               number;
  private _equipmentId:      number;
  private _startTime:        string;
  private _endTime:          string | null;
  private _anomalyDetected:  boolean;
  private _anomalyType:      string | null;

  constructor(props: {
    id:              number;
    equipmentId:     number;
    startTime:       string;
    endTime:         string | null;
    anomalyDetected: boolean;
    anomalyType:     string | null;
  }) {
    this._id              = props.id;
    this._equipmentId     = props.equipmentId;
    this._startTime       = props.startTime;
    this._endTime         = props.endTime;
    this._anomalyDetected = props.anomalyDetected;
    this._anomalyType     = props.anomalyType;
  }

  get id():              number       { return this._id; }
  set id(v: number)                   { this._id = v; }
  get equipmentId():     number       { return this._equipmentId; }
  get startTime():       string       { return this._startTime; }
  get endTime():         string | null { return this._endTime; }
  get anomalyDetected(): boolean      { return this._anomalyDetected; }
  get anomalyType():     string | null { return this._anomalyType; }

  get isActive(): boolean { return this._endTime === null; }
}
