import Call from './call';

const IS_MOXY = Symbol('is_moxy');

// eslint-disable-next-line typescript/no-use-before-define
type PropMockMapping = { [k: string /* | number | symbol */]: Mock };
// FIXME: wait Microsoft/TypeScript#26797 to support 👆
export type Proxifiable = object | Function;

type ProxyMiddleware = (
  handler: ProxyHandler<Proxifiable>,
  source: Proxifiable,
  mock: Mock
) => ProxyHandler<Proxifiable>;

export type MockOptions = {
  accessKey: string | symbol;
  middlewares?: Array<ProxyMiddleware>;
  proxifyReturnValue: boolean;
  proxifyNewInstance: boolean;
  proxifyProperties: boolean;
  includeProperties?: Array<string | symbol>;
  excludeProperties?: Array<string | symbol>;
};

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };

const createProxyTargetDouble = source =>
  typeof source === 'function' ? function double() {} : Object.create(null);

const clearAllPropOfMocks = (mapping: PropMockMapping) => {
  Object.keys(mapping).forEach(k => {
    mapping[k].clear();
  });
};

const isProxifiable = target =>
  (typeof target === 'object' && target !== null) ||
  typeof target === 'function';

const isFunctionProp = (source, propName) =>
  typeof source === 'function' &&
  (propName === 'prototype' || propName === 'name' || propName === 'length');

export default class Mock {
  options: MockOptions;

  _calls: Array<Call>;
  _targetSourceMapping: WeakMap<Proxifiable, Proxifiable>;
  _proxifiedValueCache: WeakMap<Proxifiable, Proxifiable>;
  getterMocks: PropMockMapping;
  setterMocks: PropMockMapping;
  _defaultWrapper: Function;
  _wrapQueue: Array<Function>;

  constructor(options: MockOptionsInput = {}) {
    const defaultOptions = {
      accessKey: 'mock',
      middlewares: null,
      proxifyReturnValue: true,
      proxifyNewInstance: true,
      proxifyProperties: true,
      includeProperties: null,
      excludeProperties: null,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.reset();
    this._targetSourceMapping = new WeakMap();
  }

  get calls() {
    // NOTE: returns a copy of _calls to prevent it keeps growing while deeply
    //       comparing the calls which might traverse through the moxied object
    return [...this._calls];
  }

  proxify(source: Proxifiable): any {
    if (!isProxifiable(source)) {
      throw new TypeError(
        'Cannot create proxy with a non-object as target or handler'
      );
    }

    const target = createProxyTargetDouble(source);
    return new Proxy(target, this.handle(source));
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
    this._initCalls();

    this._proxifiedValueCache = new WeakMap();
    clearAllPropOfMocks(this.getterMocks);
    clearAllPropOfMocks(this.setterMocks);
  }

  reset() {
    this._initCalls();

    this._proxifiedValueCache = new WeakMap();
    this.getterMocks = {};
    this.setterMocks = {};
    this._wrapQueue = [];
    this._defaultWrapper = undefined;
  }

  wrap(wrapper: (Function) => Function) {
    this._defaultWrapper = wrapper;
  }

  wrapOnce(wrapper: Function) {
    this._wrapQueue.push(wrapper);
  }

  fake(implementation: Function) {
    this.wrap(() => implementation);
  }

  fakeWhenArgs(matcher: Function, implementation: Function) {
    const lastFunctor = this._defaultWrapper;

    const withArgsFunctor = source => (...args) => {
      if (matcher(...args)) {
        return implementation(...args);
      }

      return lastFunctor ? lastFunctor(source)(...args) : source(...args);
    };

    this.wrap(withArgsFunctor);
  }

  fakeOnce(implementation: Function) {
    this.wrapOnce(() => implementation);
  }

  fakeReturnValue(val: any) {
    this.wrap(() => () => val);
  }

  fakeReturnValueOnce(val: any) {
    this.wrapOnce(() => () => val);
  }

  handle(source: Proxifiable): ProxyHandler<Proxifiable> {
    const baseHandler = this._createBaseHandler(source);

    const requiredHandlerMethods = Object.keys(baseHandler);

    if (this.options.middlewares) {
      return this.options.middlewares.reduce((wrappedHandler, wrapper) => {
        const handler = wrapper(wrappedHandler, source, this);

        const lostMethod = requiredHandlerMethods.find(
          method => !(method in handler)
        );

        if (lostMethod !== undefined) {
          throw TypeError(
            `handler.${lostMethod}() is required but lost in result of middleware ${wrapper.name ||
              wrapper}`
          );
        }

        return handler;
      }, baseHandler);
    }

    return baseHandler;
  }

  _createBaseHandler(source: Proxifiable): ProxyHandler<Proxifiable> {
    return {
      get: (target, propKey, receiver) => {
        if (propKey === IS_MOXY) return true;
        if (propKey === this.options.accessKey) {
          return this;
        }

        const getterMock = this.getter(propKey);
        const implementation = getterMock._getImplementation();

        const call = new Call({ instance: receiver });

        const shouldReturnNativeProp = isFunctionProp(source, propKey);
        try {
          let property = implementation
            ? Reflect.apply(implementation, receiver, [])
            : Reflect.get(
                !shouldReturnNativeProp && propKey in target ? target : source,
                propKey
              );

          if (
            this._shouldProxifyProp(propKey) &&
            !shouldReturnNativeProp &&
            isProxifiable(property)
          ) {
            property = this._getProxified(property);
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

      set: (target, propKey, value, receiver) => {
        if (propKey === this.options.accessKey) {
          return false;
        }

        const setterMock = this.setter(propKey);
        const implementation = setterMock._getImplementation();

        const call = new Call({ args: [value], instance: receiver });

        try {
          if (implementation === undefined) {
            return Reflect.set(target, propKey, value);
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

      construct: (target, args, newTarget) => {
        const implementation = this._getImplementation(<Function>source);

        const call = new Call({ args, isConstructor: true });

        try {
          let instance = Reflect.construct(implementation, args, newTarget);

          if (this.options.proxifyNewInstance) {
            instance = this._getProxified(instance);
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

      apply: (target, thisArg, args) => {
        const implementation = this._getImplementation(<Function>source);

        const call = new Call({ args, instance: thisArg });

        try {
          let result = Reflect.apply(<Function>implementation, thisArg, args);

          if (this.options.proxifyReturnValue && isProxifiable(result)) {
            result = this._getProxified(result);
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

      getOwnPropertyDescriptor: (target, prop) =>
        Reflect.getOwnPropertyDescriptor(target, prop) ||
        Reflect.getOwnPropertyDescriptor(source, prop),

      getPrototypeOf: target =>
        (typeof source === 'object' && Reflect.getPrototypeOf(target)) ||
        Reflect.getPrototypeOf(source),

      has: (target, prop) =>
        Reflect.has(target, prop) || Reflect.has(source, prop),

      ownKeys: target =>
        Reflect.ownKeys(target).concat(Reflect.ownKeys(source)),
    };
  }

  _getProxified(target) {
    if (target[IS_MOXY]) return target;

    if (this._proxifiedValueCache.has(target)) {
      return this._proxifiedValueCache.get(target);
    }

    const childMock = new Mock(this.options);

    const proxified = childMock.proxify(target);
    this._proxifiedValueCache.set(target, proxified);

    return proxified;
  }

  _initCalls() {
    // NOTE: to prevent infinity loops caused by _calls growing while deeply comparing mocks
    Object.defineProperties(this, {
      _calls: {
        enumerable: false,
        configurable: true,
        writable: false,
        value: [],
      },
    });
  }

  _shouldProxifyProp(name) {
    const { options } = this;
    if (
      !options.proxifyProperties ||
      (options.excludeProperties && options.excludeProperties.includes(name))
    ) {
      return false;
    }
    return (
      !options.includeProperties || options.includeProperties.includes(name)
    );
  }

  _getImplementation(source?: Function) {
    if (this._wrapQueue.length > 0) {
      return this._wrapQueue.shift()(source);
    }

    if (this._defaultWrapper !== undefined) {
      return this._defaultWrapper(source);
    }

    return source;
  }
}
