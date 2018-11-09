import Call from './call';

// eslint-disable-next-line typescript/no-use-before-define
type PropMockMapping = { [k: string /* | number | symbol */]: Mock };
// FIXME: wait Microsoft/TypeScript#26797 to support 👆
export type Proxifiable = object | Function;

type ProxyMiddleware = (
  handler: ProxyHandler<Proxifiable>,
  mock: Mock
) => ProxyHandler<Proxifiable>;

export type MockOptions = {
  accessKey: string | symbol;
  middlewares: Array<ProxyMiddleware>;
  proxifyReturnValue: boolean;
  proxifyNewInstance: boolean;
  proxifyProperty: boolean;
};

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };

const clearAllPropOfMocks = (mapping: PropMockMapping) => {
  Object.keys(mapping).forEach(k => {
    mapping[k].clear();
  });
};

const isProxifiable = target =>
  typeof target === 'object' || typeof target === 'function';

export default class Mock {
  options: MockOptions;

  _calls: Array<Call>;
  proxifiedCache: WeakMap<Proxifiable, Proxifiable>;
  getterMocks: PropMockMapping;
  setterMocks: PropMockMapping;
  defaultImplementation: Function;
  impletationQueue: Array<Function>;

  constructor(options: MockOptionsInput = {}) {
    const defaultOptions = {
      accessKey: 'mock',
      middlewares: [],
      proxifyReturnValue: true,
      proxifyNewInstance: true,
      proxifyProperty: true,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.reset();
  }

  get calls() {
    // NOTE: returns a copy of _calls to prevent it keeps growing while deeply
    //       comparing the calls which might traverse through the moxied object
    return [...this._calls];
  }

  proxify(target: Proxifiable): any {
    return new Proxy(target, this.handle());
  }

  // FIXME: wait Microsoft/TypeScript#26797 to support👇
  getter(prop: any /* number | string | symbol */) {
    if (Object.prototype.hasOwnProperty.call(this.getterMocks, prop)) {
      return this.getterMocks[prop];
    }

    return (this.getterMocks[prop] = new Mock());
  }

  // FIXME: wait Microsoft/TypeScript#26797 to support👇
  setter(prop: any /* number | string | symbol */) {
    if (Object.prototype.hasOwnProperty.call(this.setterMocks, prop)) {
      return this.setterMocks[prop];
    }

    return (this.setterMocks[prop] = new Mock());
  }

  clear() {
    this._calls = [];
    this.proxifiedCache = new WeakMap();
    clearAllPropOfMocks(this.getterMocks);
    clearAllPropOfMocks(this.setterMocks);
  }

  reset() {
    this._calls = [];
    this.proxifiedCache = new WeakMap();
    this.getterMocks = {};
    this.setterMocks = {};
    this.impletationQueue = [];
    this.defaultImplementation = undefined;
  }

  fake(implementation: Function) {
    this.defaultImplementation = implementation;
  }

  fakeOnce(implementation: Function) {
    this.impletationQueue.push(implementation);
  }

  fakeReturnValue(val: any) {
    this.fake(() => val);
  }

  fakeReturnValueOnce(val: any) {
    this.fakeOnce(() => val);
  }

  getImplementation(target?: Function) {
    if (this.impletationQueue.length > 0) {
      return this.impletationQueue.shift();
    }

    if (this.defaultImplementation !== undefined) {
      return this.defaultImplementation;
    }

    return target;
  }

  getProxified(target) {
    if (this.proxifiedCache.has(target)) {
      return this.proxifiedCache.get(target);
    }

    const childMock = new Mock(this.options);

    const proxified = childMock.proxify(target);
    this.proxifiedCache.set(target, proxified);

    return proxified;
  }

  handle(): ProxyHandler<Proxifiable> {
    const baseHandler: ProxyHandler<Proxifiable> = {
      get: (target, propName, receiver) => {
        if (propName === this.options.accessKey) {
          return this;
        }

        const getterMock = this.getter(propName);
        const implementation = getterMock.getImplementation();

        const call = new Call({ instance: receiver });

        try {
          let property = implementation
            ? Reflect.apply(implementation, receiver, [])
            : Reflect.get(target, propName, receiver);

          if (this.options.proxifyProperty && isProxifiable(property)) {
            property = this.getProxified(property);
          }

          return (call.result = property);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          getterMock._calls.push(call);
        }
      },

      set: (target, propName, value, receiver) => {
        if (propName === this.options.accessKey) {
          return false;
        }

        const setterMock = this.setter(propName);
        const implementation = setterMock.getImplementation();

        const call = new Call({ args: [value], instance: receiver });

        try {
          if (implementation === undefined) {
            return Reflect.set(target, propName, value, receiver);
          }

          call.result = Reflect.apply(implementation, receiver, [value]);
          return true;
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          setterMock._calls.push(call);
        }
      },

      construct: (target: Function, args, newTarget) => {
        const implementation = this.getImplementation(target);

        const call = new Call({ args, isConstructor: true });

        try {
          let instance = Reflect.construct(implementation, args, newTarget);

          if (this.options.proxifyNewInstance) {
            instance = this.getProxified(instance);
          }

          return (call.instance = instance);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          this._calls.push(call);
        }
      },

      apply: (target: Function, thisArg, args) => {
        const implementation = this.getImplementation(target);

        const call = new Call({ args, instance: thisArg });

        try {
          let result = Reflect.apply(<Function>implementation, thisArg, args);

          if (this.options.proxifyReturnValue && isProxifiable(result)) {
            result = this.getProxified(result);
          }

          return (call.result = result);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          this._calls.push(call);
        }
      },
    };

    return this.options.middlewares.reduce(
      (wrappedHandler, wrapper) => wrapper(wrappedHandler, this),
      baseHandler
    );
  }
}
