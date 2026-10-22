export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  MAINTENANCE = 'MAINTENANCE',
  ACTIVE = 'ACTIVE',
  OCCUPIED = 'OCCUPIED',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export class Equipment {
  private _uuid: string;
  private _zoneId: string;
  private _name: string;
  private _brand: string;
  private _model: string;
  private _purchaseAmount: number;
  private _purchaseCurrency: string;
  private _status: EquipmentStatus;
  private _maintenanceThreshold: string | null;

  constructor(props: {
    uuid: string;
    zoneId: string;
    name: string;
    brand: string;
    model: string;
    purchaseAmount: number;
    purchaseCurrency: string;
    status: EquipmentStatus;
    maintenanceThreshold?: string | null;
  }) {
    this._uuid = props.uuid;
    this._zoneId = props.zoneId;
    this._name = props.name;
    this._brand = props.brand;
    this._model = props.model;
    this._purchaseAmount = props.purchaseAmount;
    this._purchaseCurrency = props.purchaseCurrency;
    this._status = props.status;
    this._maintenanceThreshold = props.maintenanceThreshold ?? null;
  }

  get uuid(): string {
    return this._uuid;
  }
  get zoneId(): string {
    return this._zoneId;
  }
  set zoneId(v: string) {
    this._zoneId = v;
  }
  get name(): string {
    return this._name;
  }
  set name(v: string) {
    this._name = v;
  }
  get brand(): string {
    return this._brand;
  }
  set brand(v: string) {
    this._brand = v;
  }
  get model(): string {
    return this._model;
  }
  set model(v: string) {
    this._model = v;
  }
  get purchaseAmount(): number {
    return this._purchaseAmount;
  }
  set purchaseAmount(v: number) {
    this._purchaseAmount = v;
  }
  get purchaseCurrency(): string {
    return this._purchaseCurrency;
  }
  set purchaseCurrency(v: string) {
    this._purchaseCurrency = v;
  }
  get status(): EquipmentStatus {
    return this._status;
  }
  set status(v: EquipmentStatus) {
    this._status = v;
  }
  get maintenanceThreshold(): string | null {
    return this._maintenanceThreshold;
  }
  set maintenanceThreshold(v: string | null) {
    this._maintenanceThreshold = v;
  }
}
