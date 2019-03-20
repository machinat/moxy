interface CallInput {
  args?: any[];
  result?: any;
  instance?: any;
  isThrow?: boolean;
  isConstructor?: boolean;
}

export default class Call {
  public args: any[];
  public result: any;
  public instance: any;
  public isThrow: boolean;
  public isConstructor: boolean;

  public constructor({
    args = [],
    result,
    instance,
    isThrow = false,
    isConstructor = false,
  }: CallInput = {}) {
    this.args = args;
    this.result = result;
    this.instance = instance;
    this.isThrow = isThrow;
    this.isConstructor = isConstructor;
  }
}
