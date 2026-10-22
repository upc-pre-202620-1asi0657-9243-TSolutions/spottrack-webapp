import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class MembershipPlan implements BaseEntity {
  private _id:          number;
  private _name:        string;
  private _description: string;
  private _price:       number;
  private _maxBranches: number;
  private _features:    string[];
  private _isActive:    boolean;

  constructor(props: {
    id:          number;
    name:        string;
    description: string;
    price:       number;
    maxBranches: number;
    features:    string[];
    isActive:    boolean;
  }) {
    this._id          = props.id;
    this._name        = props.name;
    this._description = props.description;
    this._price       = props.price;
    this._maxBranches = props.maxBranches;
    this._features    = props.features;
    this._isActive    = props.isActive;
  }

  get id():          number   { return this._id; }
  set id(v: number)           { this._id = v; }
  get name():        string   { return this._name; }
  get description(): string   { return this._description; }
  get price():       number   { return this._price; }
  get maxBranches(): number   { return this._maxBranches; }
  get features():    string[] { return this._features; }
  get isActive():    boolean  { return this._isActive; }
}
