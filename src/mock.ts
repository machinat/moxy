import Call from './call';
import {
  createProxyTargetDouble,
  clearPropMockMapping,
  isProxifiable,
  isFunctionProp,
  formatUnproxifiable,
  checkPropIsSetter,
} from './utils';

import {
  MockOptions,
  Proxifiable,
  PropMockMapping,
  MockOptionsInput,
  ProxifiedCache,
} from './type';

const IS_MOXY = Symbol('is_moxy');

export const isMoxy = moxied => moxied[IS_MOXY] === true;

export default class Mock {
  options: MockOptions;

  _calls: Call[];
  _proxifiedValues: ProxifiedCache;
  _proxifiedProps: ProxifiedCache;

  getterMocks: PropMockMapping;
  setterMocks: PropMockMapping;
  _defaultWrapper: Function;
  _wrapQueue: Function[];

  constructor(options: MockOptionsInput = {}) {
    const defaultOptions = {
      mockAccessKey: 'mock',
      middlewares: null,
      mockReturnValue: false,
      mockNewInstance: true,
      mockProperty: true,
      includeProps: null,
      excludeProps: null,
      recordGetter: false,
      recordSetter: true,
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

  proxify(source: Proxifiable): any {
    if (!isProxifiable(source)) {
      throw new TypeError(
        `Cannot create a proxy with ${formatUnproxifiable(source)}`
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
    this._proxifiedValues = new Map();

    // clear also mock of proxified props
    for (const proxiedProp of this._proxifiedProps.values()) {
      proxiedProp[this.options.mockAccessKey].clear();
    }

    clearPropMockMapping(this.getterMocks);
    clearPropMockMapping(this.setterMocks);
    return this;
  }

  reset() {
    this._initCalls();

    this._proxifiedValues = new Map();
    this._proxifiedProps = new Map();

    this.getterMocks = {};
    this.setterMocks = {};

    this._wrapQueue = [];
    this._defaultWrapper = undefined;

    return this;
  }

  wrap(wrapper: (Function) => Function) {
    this._defaultWrapper = wrapper;
    return this;
  }

  wrapOnce(wrapper: Function) {
    this._wrapQueue.push(wrapper);
    return this;
  }

  fake(implementation: Function) {
    this.wrap(() => implementation);
    return this;
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
    return this;
  }

  fakeOnce(implementation: Function) {
    this.wrapOnce(() => implementation);
    return this;
  }

  fakeReturnValue(val: any) {
    this.wrap(() => () => val);
    return this;
  }

  fakeReturnValueOnce(val: any) {
    this.wrapOnce(() => () => val);
    return this;
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
        if (propKey === this.options.mockAccessKey) {
          return this;
        }

        const getterMock = this.getter(propKey);
        const implementation = getterMock._getImplementation();

        const call = new Call({ instance: receiver });

        const shouldGetFromSource = isFunctionProp(source, propKey);
        try {
          let property = implementation
            ? Reflect.apply(implementation, receiver, [])
            : Reflect.get(
                !shouldGetFromSource && propKey in target ? target : source,
                propKey,
                receiver
              );

          if (
            this._shouldProxifyProp(propKey) &&
            !shouldGetFromSource &&
            isProxifiable(property)
          ) {
            property = this._getProxified(this._proxifiedProps, property);
          }

          return (call.result = property);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          if (this.options.recordGetter) getterMock._calls.push(call);
        }
      },

      set: (target, propKey, value, receiver) => {
        if (propKey === this.options.mockAccessKey) {
          return false;
        }

        const setterMock = this.setter(propKey);
        const implementation = setterMock._getImplementation();

        const call = new Call({ args: [value], instance: receiver });

        try {
          if (implementation !== undefined) {
            call.result = Reflect.apply(implementation, receiver, [value]);
            return true;
          }

          return checkPropIsSetter(source, propKey)
            ? Reflect.set(source, propKey, value, receiver)
            : Reflect.set(target, propKey, value);
        } catch (err) {
          call.isThrow = true;
          call.result = err;

          throw err;
        } finally {
          if (this.options.recordSetter) setterMock._calls.push(call);
        }
      },

      construct: (target, args, newTarget) => {
        const implementation = this._getImplementation(<Function>source);

        const call = new Call({ args, isConstructor: true });

        try {
          let instance = Reflect.construct(implementation, args, newTarget);

          if (this.options.mockNewInstance) {
            instance = this._getProxified(this._proxifiedValues, instance);
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

          if (this.options.mockReturnValue) {
            result = isProxifiable(result)
              ? this._getProxified(this._proxifiedValues, result)
              : result instanceof Promise
              ? result.then(r =>
                  isProxifiable(r)
                    ? this._getProxified(this._proxifiedValues, r)
                    : r
                )
              : result;
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

      getOwnPropertyDescriptor: (target, prop) => {
        const targetDesc = Reflect.getOwnPropertyDescriptor(target, prop);
        if (targetDesc) return targetDesc;

        const sourceDesc = Reflect.getOwnPropertyDescriptor(source, prop);
        return (
          sourceDesc && {
            ...sourceDesc,
            configurable: true,
          }
        );
      },

      getPrototypeOf: target =>
        (typeof source === 'object' && Reflect.getPrototypeOf(target)) ||
        Reflect.getPrototypeOf(source),

      has: (target, prop) =>
        Reflect.has(target, prop) || Reflect.has(source, prop),

      ownKeys: target => [
        ...new Set(
          Reflect.ownKeys(target).concat(Reflect.ownKeys(source))
        ).values(),
      ],
    };
  }

  _getProxified(cache: ProxifiedCache, target) {
    if (isMoxy(target)) return target;

    if (cache.has(target)) {
      return cache.get(target);
    }

    const childMock = new Mock(this.options);

    const proxified = childMock.proxify(target);
    cache.set(target, proxified);

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
      !options.mockProperty ||
      (options.excludeProps && options.excludeProps.includes(name))
    ) {
      return false;
    }
    return !options.includeProps || options.includeProps.includes(name);
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
