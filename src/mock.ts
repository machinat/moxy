import micromatch from 'micromatch';
import Call from './call.js';
import createProxyTargetDouble from './utils/createProxyTargetDouble.js';
import clearPropMockMapping from './utils/clearPropMockMapping.js';
import isProxifiable from './utils/isProxifiable.js';
import isFunctionProtoProp from './utils/isFunctionProtoProp.js';
import formatUnproxifiable from './utils/formatUnproxifiable.js';
import checkPropIsSetter from './utils/checkPropIsSetter.js';
import isMoxy from './helpers/isMoxy.js';
import { IS_MOXY } from './constant.js';
import type {
  MockOptions,
  Proxifiable,
  PropMockMapping,
  MockOptionsInput,
  ProxifiedCache,
  FunctionImpl,
  WrapImplFunctor,
  Moxy,
  MockAccossorWildcard,
} from './types.js';

const matchPatterns = micromatch.isMatch;

/**
 * The underlying controller that handle the mocking logic and track calls
 */
export default class Mock {
  public options: MockOptions;

  private _calls!: Call[];

  private _proxifiedDoubles: ProxifiedCache;
  private _proxifiedValues!: ProxifiedCache;
  private _proxifiedProps!: ProxifiedCache;

  public getterMocks!: PropMockMapping;
  public setterMocks!: PropMockMapping;

  private _mainWrapper: undefined | WrapImplFunctor;
  private _oneOffWrapperQueue!: WrapImplFunctor[];

  private _propWhitelistSymbols: symbol[];
  private _propWhitelistPatterns: string[];
  private _propBlacklistSymbols: symbol[];
  private _propBlacklistPatterns: string[];

  public constructor(options: MockOptionsInput = {}) {
    const defaultOptions = {
      accessKey: 'mock',
      mockReturn: false,
      mockNewInstance: true,
      mockMethod: true,
      recordGetter: false,
      recordSetter: true,
      middlewares: null,
      includeProperties: null,
      excludeProperties: null,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    const { includeProperties, excludeProperties } = this.options;

    this._propWhitelistSymbols = includeProperties
      ? includeProperties.filter((p): p is symbol => typeof p === 'symbol')
      : [];

    this._propWhitelistPatterns = includeProperties
      ? includeProperties.filter((p): p is string => typeof p === 'string')
      : [];

    this._propBlacklistSymbols = excludeProperties
      ? excludeProperties.filter((p): p is symbol => typeof p === 'symbol')
      : [];

    this._propBlacklistPatterns = excludeProperties
      ? excludeProperties.filter((p): p is string => typeof p === 'string')
      : [];

    this._proxifiedDoubles = new Map();
    this._proxifiedProps = new Map();

    this.reset();
  }

  public get calls() {
    return this.getCalls();
  }

  /**
   * Get function calls triggered on the mock. Calls are emptied after `.clear()` or `.reset()`
   */
  public getCalls(): Call[] {
    return [...this._calls];
  }

  /**
   * Create a proxy of the target. Operations to the proxied instance are
   * tracked and can be faked by the mock
   */
  public proxify<T extends Proxifiable>(source: T): Moxy<T> {
    if (!isProxifiable(source)) {
      throw new TypeError(
        `Cannot create a proxy with ${formatUnproxifiable(source)}`
      );
    }

    const double: any = createProxyTargetDouble(source);
    const proxified = new Proxy(double, this.handle(source));

    this._proxifiedDoubles.set(double, proxified);
    return proxified;
  }

  /**
   * Return a mock that tracks and fakes getter actions on a property. Note that
   * the getter calls are recorded only when `recordGetter` option is set to `true`
   */
  public getter(prop: number | string | symbol): Mock {
    if (Object.prototype.hasOwnProperty.call(this.getterMocks, prop)) {
      return this.getterMocks[prop];
    }
    return (this.getterMocks[prop] = new Mock());
  }

  /**
   * Return a mock that tracks and fakes setter actions on a property. You can
   * stop recording setter calls by setting `recordSetter` to `false`
   */
  public setter(prop: number | string | symbol): Mock {
    if (Object.prototype.hasOwnProperty.call(this.setterMocks, prop)) {
      return this.setterMocks[prop];
    }
    return (this.setterMocks[prop] = new Mock());
  }

  /**
   * Clear calling records of the mock and children mocks of its properties
   */
  public clear(): this {
    this._initCalls();
    this._proxifiedValues = new Map();

    // clear also mock of proxified props
    for (const proxiedProp of this._proxifiedProps.values()) {
      (proxiedProp as MockAccossorWildcard)[this.options.accessKey].clear();
    }

    clearPropMockMapping(this.getterMocks);
    clearPropMockMapping(this.setterMocks);
    return this;
  }

  /**
   * Clear calling records and faked implementations of the mock and children
   * mocks of its properties
   */
  public reset(): this {
    this._initCalls();

    this._proxifiedValues = new Map();

    // reset also mock of proxified props
    for (const proxiedProp of this._proxifiedProps.values()) {
      (proxiedProp as MockAccossorWildcard)[this.options.accessKey].reset();
    }

    this.getterMocks = {};
    this.setterMocks = {};

    this._oneOffWrapperQueue = [];
    this._mainWrapper = undefined;

    return this;
  }

  /**
   * Wrap a faked implementation around the original function
   */
  public wrap(wrapper: WrapImplFunctor): this {
    this._mainWrapper = wrapper;
    return this;
  }

  /**
   * Wrap a faked implementation only once. If called many times, implementations
   * are executed in the calling orders
   */
  public wrapOnce(wrapper: WrapImplFunctor): this {
    this._oneOffWrapperQueue.push(wrapper);
    return this;
  }

  /**
   * Fake implementation function of the target
   */
  public fake(implementation: FunctionImpl): this {
    this.wrap(() => implementation);
    return this;
  }

  /**
   * Fake implementation function only when calling args match by predicate function
   */
  public fakeWhenArgs(
    predicate: (...args: any[]) => boolean,
    implementation: FunctionImpl
  ): this {
    const lastWrapper = this._mainWrapper;

    const whenArgsFunctor =
      (source: FunctionImpl) =>
      (...args: any[]): any => {
        if (predicate(...args)) {
          return implementation(...args);
        }

        return lastWrapper
          ? lastWrapper(source, this)(...args)
          : source(...args);
      };

    this.wrap(whenArgsFunctor);
    return this;
  }

  /**
   * Fake implementation function only once. If called many times, implementations
   * are executed in the calling orders
   */
  public fakeOnce(implementation: FunctionImpl): this {
    this.wrapOnce(() => implementation);
    return this;
  }

  /**
   * Fake returned value of the target function
   */
  public fakeReturnValue(val: any): this {
    this.wrap(() => () => val);
    return this;
  }

  /**
   * Fake returned value of the target function. If called many times, implementations
   * are executed in the calling orders
   */
  public fakeReturnValueOnce(val: any): this {
    this.wrapOnce(() => () => val);
    return this;
  }

  /**
   * Fake the target function by returning a resolved promise
   */
  public fakeResolvedValue(val: any): this {
    this.fakeReturnValue(Promise.resolve(val));
    return this;
  }

  /**
   * Fake the target function by returning a resolved promise only once. If called
   * many times, implementations are executed in the calling orders
   */
  public fakeResolvedValueOnce(val: any): this {
    this.fakeReturnValueOnce(Promise.resolve(val));
    return this;
  }

  /**
   * Fake the target function by returning a rejected promise
   */
  public fakeRejectedValue(val: any): this {
    this.fakeReturnValue(Promise.reject(val));
    return this;
  }

  /**
   * Fake the target function by returning a rejected promise only once. If called
   * many times, implementations are executed in the calling orders
   */
  public fakeRejectedValueOnce(val: any): this {
    this.fakeReturnValueOnce(Promise.reject(val));
    return this;
  }

  /**
   * Return the proxy handler for the target to mock
   */
  public handle(source: Proxifiable): ProxyHandler<Proxifiable> {
    const baseHandler = this._createBaseHandler(source);

    const requiredHandlerMethods = Object.keys(baseHandler);

    if (this.options.middlewares === null) {
      return baseHandler;
    }

    return this.options.middlewares.reduce((wrappedHandler, wrapper) => {
      const handler = wrapper(wrappedHandler, source, this);

      const lostMethod = requiredHandlerMethods.find(
        (method) => !(method in handler)
      );

      if (lostMethod !== undefined) {
        throw TypeError(
          `handler.${lostMethod}() is required but lost in result of middleware ${
            wrapper.name || wrapper
          }`
        );
      }

      return handler;
    }, baseHandler);
  }

  private _createBaseHandler(source: Proxifiable): ProxyHandler<Proxifiable> {
    return {
      get: (double, propKey, receiver) => {
        // only report as moxied when get on the porxy itself but its descendants
        if (
          propKey === IS_MOXY &&
          this._proxifiedDoubles.get(double) === receiver
        ) {
          return true;
        }

        if (
          propKey === this.options.accessKey &&
          this._proxifiedDoubles.get(double) === receiver
        ) {
          return this;
        }

        const shouldGetFromSource = isFunctionProtoProp(source, propKey);

        const defaultImpl = () => {
          return Reflect.get(
            !shouldGetFromSource && propKey in double ? double : source,
            propKey,
            receiver
          );
        };

        const getterMock = this.getter(propKey);
        const getterImpl = getterMock._getFunctionImpl(defaultImpl);
        const call = new Call({ instance: receiver });

        try {
          let property = Reflect.apply(getterImpl, receiver, []);

          if (
            this._shouldProxifyProp(propKey, property) &&
            !shouldGetFromSource &&
            isProxifiable(property)
          ) {
            property = this._getProxified(this._proxifiedProps, property);
          }

          return (call.result = property);
        } catch (err) {
          call.isThrown = true;
          call.result = err;

          throw err;
        } finally {
          if (this.options.recordGetter) {
            getterMock._calls.push(call);
          }
        }
      },

      set: (double, propKey, value, receiver) => {
        if (propKey === this.options.accessKey) {
          return false;
        }

        let success = true;

        const defaultImpl = (wrapedValue: any) => {
          success = checkPropIsSetter(source, propKey)
            ? Reflect.set(source, propKey, wrapedValue, receiver)
            : Reflect.set(double, propKey, wrapedValue);
        };

        const setterMock = this.setter(propKey);
        const setterImpl = setterMock._getFunctionImpl(defaultImpl);
        const call = new Call({ args: [value], instance: receiver });

        try {
          call.result = Reflect.apply(setterImpl, receiver, [value]);
          return success;
        } catch (err) {
          call.isThrown = true;
          call.result = err;

          throw err;
        } finally {
          if (this.options.recordSetter) {
            setterMock._calls.push(call);
          }
        }
      },

      construct: (double, args, newTarget) => {
        const implementation = this._getFunctionImpl(source as FunctionImpl);

        const call = new Call({ args, isConstructor: true });

        try {
          let instance = Reflect.construct(implementation, args, newTarget);

          if (this.options.mockNewInstance) {
            instance = this._getProxified(this._proxifiedValues, instance);
          }

          return (call.instance = instance);
        } catch (err) {
          call.isThrown = true;
          call.result = err;

          throw err;
        } finally {
          this._calls.push(call);
        }
      },

      apply: (double, thisArg, args) => {
        const implementation = this._getFunctionImpl(source as FunctionImpl);

        const call = new Call({ args, instance: thisArg });

        try {
          let result = Reflect.apply(implementation, thisArg, args);

          if (this.options.mockReturn) {
            result = isProxifiable(result)
              ? this._getProxified(this._proxifiedValues, result)
              : result instanceof Promise
              ? result.then((r) =>
                  isProxifiable(r)
                    ? this._getProxified(this._proxifiedValues, r)
                    : r
                )
              : result;
          }

          return (call.result = result);
        } catch (err) {
          call.isThrown = true;
          call.result = err;

          throw err;
        } finally {
          this._calls.push(call);
        }
      },

      getOwnPropertyDescriptor: (double, prop) => {
        const targetDesc = Reflect.getOwnPropertyDescriptor(double, prop);
        if (targetDesc) return targetDesc;

        const sourceDesc = Reflect.getOwnPropertyDescriptor(source, prop);
        return (
          sourceDesc && {
            ...sourceDesc,
            configurable: true,
          }
        );
      },

      getPrototypeOf: (double) =>
        typeof source === 'object'
          ? // object double has prototype default to null, if not set by user
            // return prototype of source
            Reflect.getPrototypeOf(double) || Reflect.getPrototypeOf(source)
          : Reflect.getPrototypeOf(source),

      has: (double, prop) =>
        Reflect.has(double, prop) || Reflect.has(source, prop),

      ownKeys: (double) => [
        ...new Set(
          Reflect.ownKeys(double).concat(Reflect.ownKeys(source))
        ).values(),
      ],
    };
  }

  private _getProxified(
    cache: ProxifiedCache,
    source: Proxifiable
  ): Proxifiable {
    if (isMoxy(source)) return source;

    const cached = cache.get(source);
    if (cached !== undefined) {
      return cached;
    }

    const childMock = new Mock(this.options);

    const proxified = childMock.proxify(source);
    cache.set(source, proxified);

    return proxified;
  }

  private _initCalls(): void {
    // HACK: to prevent infinity loops caused by _calls growing while deeply comparing mocks
    Object.defineProperties(this, {
      _calls: {
        enumerable: false,
        configurable: true,
        writable: false,
        value: [],
      },
    });
  }

  private _shouldProxifyProp(
    key: number | string | symbol,
    value: any
  ): boolean {
    if (typeof key === 'number') return false;

    const { options } = this;
    if (
      typeof key === 'string'
        ? matchPatterns(key, this._propBlacklistPatterns)
        : this._propBlacklistSymbols.includes(key)
    ) {
      return false;
    }

    return (
      (typeof value === 'function' && options.mockMethod) ||
      (typeof key === 'string'
        ? matchPatterns(key, this._propWhitelistPatterns)
        : this._propWhitelistSymbols.includes(key))
    );
  }

  private _getFunctionImpl(source: FunctionImpl): FunctionImpl {
    if (this._oneOffWrapperQueue.length > 0) {
      return (this._oneOffWrapperQueue.shift() as WrapImplFunctor)(
        source,
        this
      );
    }

    if (this._mainWrapper !== undefined) {
      return this._mainWrapper(source, this);
    }
    return source;
  }
}
