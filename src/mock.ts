import Call from './call';

export type MockOptions = {
  accessKey?: string | symbol;
};

type Proxifiable = object | Function;
// eslint-disable-next-line no-use-before-define
type PropMockMapping = { [k: string /* | number | symbol */]: Mock };
// FIXME: wait Microsoft/TypeScript#26797 to support 👆

const clearAllPropOfMocks = (mapping: PropMockMapping) => {
  Object.keys(mapping).forEach(k => {
    mapping[k].clear();
  });
};

export default class Mock {
  options: MockOptions;
  calls: Array<Call>;
  proxifiedCache: WeakMap<Proxifiable, Proxifiable>;
  getterMocks: PropMockMapping;
  setterMocks: PropMockMapping;
  defaultImplementation: Function;
  impletationQueue: Array<Function>;

  static proxify(target: Proxifiable, mock: Mock) {
    return new Proxy(target, mock.handler());
  }

  constructor(options: MockOptions = {}) {
    const defaultOptions = {
      accessKey: 'mock',
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.reset();
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

    const proxified = Mock.proxify(target, new Mock(this.options));
    this.proxifiedCache.set(target, proxified);

    return proxified;
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
    this.calls = [];
    this.proxifiedCache = new WeakMap();
    clearAllPropOfMocks(this.getterMocks);
    clearAllPropOfMocks(this.setterMocks);
  }

  reset() {
    this.calls = [];
    this.proxifiedCache = new WeakMap();
    this.getterMocks = {};
    this.setterMocks = {};
    this.impletationQueue = [];
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

  handler() {
    const mock = this;

    return {
      get(target, propName, receiver) {
        if (propName === mock.options.accessKey) {
          return mock;
        }

        const getterMock = mock.getter(propName);
        const implementation = getterMock.getImplementation();

        const call = new Call({ instance: receiver });

        try {
          let property = implementation
            ? Reflect.apply(implementation, receiver, [])
            : Reflect.get(target, propName, receiver);

          if (typeof property === 'object' || typeof property === 'function') {
            property = mock.getProxified(property);
          }

          return (call.result = property);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          getterMock.calls.push(call);
        }
      },

      set(target, propName, value, receiver) {
        if (propName === mock.options.accessKey) {
          return false;
        }

        const setterMock = mock.setter(propName);
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
          setterMock.calls.push(call);
        }
      },

      construct(target, args, newTarget) {
        const implementation = mock.getImplementation(target);

        const call = new Call({ args, isConstructor: true });

        try {
          const instance = mock.getProxified(
            Reflect.construct(implementation, args, newTarget)
          );

          return (call.instance = instance);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          mock.calls.push(call);
        }
      },

      apply(target, thisArg, args) {
        const implementation = mock.getImplementation(target);

        const call = new Call({ args, instance: thisArg });

        try {
          let result = Reflect.apply(<Function>implementation, thisArg, args);

          if (typeof result === 'object' || typeof result === 'function') {
            result = this.proxify(result);
          }

          return (call.result = result);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          mock.calls.push(call);
        }
      },
    };
  }
}
