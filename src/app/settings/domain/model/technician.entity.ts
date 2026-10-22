export class Technician {
  private _id:   string;
  private _name: string;

  constructor(props: { id: string; name: string }) {
    this._id   = props.id;
    this._name = props.name;
  }

  get id():   string { return this._id; }
  get name(): string { return this._name; }
}
