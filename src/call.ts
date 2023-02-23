interface CallInput {
  args?: any[];
  result?: any;
  instance?: any;
  isThrown?: boolean;
  isConstructor?: boolean;
}

export default class Call {
  public args: any[];
  public result: any;
  public instance: any;
  public isThrown: boolean;
  public isConstructor: boolean;

  public constructor({
    args = [],
    result,
    instance,
    isThrown = false,
    isConstructor = false,
  }: CallInput = {}) {
    this.args = args;
    this.result = result;
    this.instance = instance;
    this.isThrown = isThrown;
    this.isConstructor = isConstructor;
  }
}
