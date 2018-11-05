interface CallObj {
  args?: Array<any>;
  result?: any;
  instance?: any;
  isThrow?: boolean;
  isConstructor?: boolean;
}

export default class Call {
  args: Array<any>;
  result: any;
  instance: any;
  isThrow: boolean;
  isConstructor: boolean;

  constructor({
    args = [],
    result,
    instance,
    isThrow = false,
    isConstructor = false,
  }: CallObj = {}) {
    this.args = args;
    this.result = result;
    this.instance = instance;
    this.isThrow = isThrow;
    this.isConstructor = isConstructor;
  }
}
