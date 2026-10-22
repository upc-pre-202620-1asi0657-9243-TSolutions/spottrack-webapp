import { BaseEntity } from '../../../shared/infrastructure/base-entity';

/**
 * Per-equipment analytics derived from ActivityReport + equipments.
 * Computed on the frontend from API data.
 */
export class AnalyticsStat implements BaseEntity {
  private _id:                   number;
  private _equipmentId:          string;
  private _equipmentName:        string;
  private _zoneId:               number;
  private _totalUsageHours:      number;
  private _downtimeCost:         number;
  private _percentageComparison: number;
  private _status:               string;

  constructor(props: {
    id:                   number;
    equipmentId:          string;
    equipmentName:        string;
    zoneId:               number;
    totalUsageHours:      number;
    downtimeCost:         number;
    percentageComparison: number;
    status:               string;
  }) {
    this._id                   = props.id;
    this._equipmentId          = props.equipmentId;
    this._equipmentName        = props.equipmentName;
    this._zoneId               = props.zoneId;
    this._totalUsageHours      = props.totalUsageHours;
    this._downtimeCost         = props.downtimeCost;
    this._percentageComparison = props.percentageComparison;
    this._status               = props.status;
  }

  get id():                   number { return this._id; }
  set id(v: number)                  { this._id = v; }
  get equipmentId():          string { return this._equipmentId; }
  get equipmentName():        string { return this._equipmentName; }
  get zoneId():                number { return this._zoneId; }
  get totalUsageHours():      number { return this._totalUsageHours; }
  get downtimeCost():         number { return this._downtimeCost; }
  get percentageComparison(): number { return this._percentageComparison; }
  get status():                string { return this._status; }
}
