export enum TicketStatus {
  OPEN        = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED    = 'RESOLVED',
}

export enum TicketPriority {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
}

export class MaintenanceTicket {
  private _id:            string;
  private _maintenanceId: string;
  private _equipmentId:   string;
  private _status:        TicketStatus;
  private _priority:      TicketPriority;
  private _type:          TicketType;
  private _createdAt:     string;
  private _description:   string;
  private _assignee:      string;
  private _completedBy:   string;

  constructor(props: {
    id:            string;
    maintenanceId: string;
    equipmentId:   string;
    status:        TicketStatus;
    priority:      TicketPriority;
    type:          TicketType;
    createdAt:     string;
    description:   string;
    assignee:      string;
    completedBy:   string;
  }) {
    this._id            = props.id;
    this._maintenanceId = props.maintenanceId;
    this._equipmentId   = props.equipmentId;
    this._status        = props.status;
    this._priority       = props.priority;
    this._type          = props.type;
    this._createdAt     = props.createdAt;
    this._description   = props.description;
    this._assignee       = props.assignee;
    this._completedBy   = props.completedBy;
  }

  get id():            string          { return this._id; }
  get maintenanceId(): string          { return this._maintenanceId; }
  get equipmentId():   string          { return this._equipmentId; }
  get status():        TicketStatus    { return this._status; }
  set status(v:        TicketStatus)   { this._status = v; }
  get priority():      TicketPriority  { return this._priority; }
  get type():          TicketType      { return this._type; }
  get createdAt():     string          { return this._createdAt; }
  get description():   string          { return this._description; }
  get assignee():      string          { return this._assignee; }
  set assignee(v:      string)         { this._assignee = v; }
  get completedBy():   string          { return this._completedBy; }
  set completedBy(v:   string)         { this._completedBy = v; }
}
