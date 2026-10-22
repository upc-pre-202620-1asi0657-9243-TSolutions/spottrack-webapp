/**
 * Equipment has no numeric id on the wire (only a string equipmentId UUID),
 * so this doesn't implement the numeric-id BaseEntity contract.
 */
export class FinancialStat {
  private _id:              string;
  private _equipmentId:     string;
  private _equipmentName:   string;
  private _status:          string;
  private _purchasePrice:   number;
  private _totalUsageHours: number;
  private _downtimeCost:    number;

  constructor(props: {
    id:              string;
    equipmentId:     string;
    equipmentName:   string;
    status:          string;
    purchasePrice:   number;
    totalUsageHours: number;
    downtimeCost:    number;
  }) {
    this._id              = props.id;
    this._equipmentId     = props.equipmentId;
    this._equipmentName   = props.equipmentName;
    this._status          = props.status;
    this._purchasePrice   = props.purchasePrice;
    this._totalUsageHours = props.totalUsageHours;
    this._downtimeCost    = props.downtimeCost;
  }

  get id():              string { return this._id; }
  get equipmentId():     string { return this._equipmentId; }
  get equipmentName():   string { return this._equipmentName; }
  get status():          string { return this._status; }
  get purchasePrice():   number { return this._purchasePrice; }
  get totalUsageHours(): number { return this._totalUsageHours; }
  get downtimeCost():    number { return this._downtimeCost; }
}
