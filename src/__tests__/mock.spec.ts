import moxy from '..';
import Call from '../call';
import Mock from '../mock';
import isMoxy from '../helpers/isMoxy';
import trackCurriedFunction from '../helpers/trackCurriedFunction';

declare let global: { Proxy: any };

it('is a constructor', () => {
  expect(typeof Mock).toBe('function');
  expect(() => new Mock()).not.toThrow();
});

describe('.constructor(options)', () => {
  it('init with expected default value', () => {
    expect(new Mock().options).toEqual({
      accessKey: 'mock',
      middlewares: null,
      mockReturn: false,
      mockNewInstance: true,
      mockMethod: true,
      includeProperties: null,
      excludeProperties: null,
      recordGetter: false,
      recordSetter: true,
    });
  });

  it('init with all options replaceable', () => {
    const fullOptions = {
      accessKey: 'MOCK',
      middlewares: [(handler: ProxyHandler<any>) => handler],
      mockReturn: false,
      mockNewInstance: false,
      mockMethod: false,
      includeProperties: ['foo'],
      excludeProperties: ['bar'],
      recordGetter: true,
      recordSetter: true,
    };

    expect(new Mock(fullOptions).options).toEqual(fullOptions);
  });

  it('init with options partially replaced', () => {
    expect(
      new Mock({
        accessKey: 'moooock',
        mockReturn: false,
        includeProperties: ['foo', 'bar'],
        recordGetter: true,
      }).options
    ).toEqual({
      accessKey: 'moooock',
      middlewares: null,
      mockReturn: false,
      mockNewInstance: true,
      mockMethod: true,
      includeProperties: ['foo', 'bar'],
      excludeProperties: null,
      recordGetter: true,
      recordSetter: true,
    });
  });

  it('initiate basic props', () => {
    const mock = new Mock();

    expect(mock.getCalls()).toEqual([]);
    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});
  });
});

describe('.proxify(source, mock)', () => {
  const _Proxy = global.Proxy;

  afterEach(() => {
    global.Proxy = _Proxy;
  });

  it('returns new Proxy(target, mock.handle()) with transfromed empty target', () => {
    const handler = { apply() {} };
    const mockInstance = moxy(new Mock(), {
      mockReturn: false,
      mockMethod: false,
      includeProperties: ['handle'],
    });
    (mockInstance.handle as any).mock.fakeReturnValue(handler);

    global.Proxy = moxy(class {}, {
      mockNewInstance: false,
      mockMethod: false,
    });

    const fn = () => {};
    const moxiedFn = mockInstance.proxify(fn);

    const obj = {};
    const moxiedObj = mockInstance.proxify(obj);

    expect((mockInstance.handle as any).mock.getCalls()).toEqual([
      new Call({ args: [fn], instance: mockInstance, result: handler }),
      new Call({ args: [obj], instance: mockInstance, result: handler }),
    ]);

    expect(global.Proxy.mock.getCalls().length).toBe(2);

    const fnCall = global.Proxy.mock.getCalls()[0];
    expect(typeof fnCall.args[0]).toBe('function');
    expect(fnCall.args[0](1, 2, 3)).toBe(undefined);
    expect(fnCall.args[1]).toBe(handler);
    expect(fnCall).toEqual(
      expect.objectContaining({
        isThrown: false,
        isConstructor: true,
        instance: moxiedFn,
        result: undefined,
      })
    );

    expect(global.Proxy.mock.getCalls()[1]).toEqual({
      args: [{}, handler],
      isThrown: false,
      isConstructor: true,
      instance: moxiedObj,
      result: undefined,
    });
  });
});

describe('.getCalls()', () => {
  it('returns a copy of _call', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => {});

    moxied();
    const calls = mock.getCalls();
    expect(calls).toEqual([new Call()]);

    moxied();
    expect(calls.length).toBe(1);
  });
});

describe(`Faking methods
  .wrap(functor)
  .wrapOnce(functor)
  .fake(impl)
  .fakeWhenArgs(matcher, impl)
  .fakeOnce(impl)
  .fakeReturnValue(val)
  .fakeReturnValueOnce(val)
`, () => {
  it('return mock itself', () => {
    const mock = new Mock();

    expect(mock.wrap(() => () => 1)).toBe(mock);
    expect(mock.wrapOnce(() => () => 1)).toBe(mock);
    expect(mock.fake(() => 1)).toBe(mock);
    expect(mock.fakeWhenArgs((x: any) => !!x, () => 1)).toBe(mock);
    expect(mock.fakeOnce(() => 1)).toBe(mock);
    expect(mock.fakeReturnValue(1)).toBe(mock);
    expect(mock.fakeReturnValueOnce(1)).toBe(mock);
  });

  it('invoke original target if not faked', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => 0);

    expect(moxied()).toBe(0);
  });

  it('.wrap(wrapper) wrap the original function to fake impl', () => {
    const mock = new Mock();
    const source = () => 0;
    const moxied: any = mock.proxify(source);

    const wrapper = moxy(() => () => 1);
    wrapper.mock.wrap(trackCurriedFunction());

    mock.wrap(wrapper);

    expect(moxied(1, 2, 3)).toBe(1);

    const calls = wrapper.mock.getCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].args[0]).toEqual([source, mock]);
    expect(calls[0].args[1]).toEqual([1, 2, 3]);
    expect(calls[0].result).toBe(1);

    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('.wrapOnce(wrapper) add one-off wrapper that invoked only once', () => {
    const mock = new Mock();
    const source = () => 0;
    const moxied: any = mock.proxify(source);

    const wrapper1 = moxy(() => () => 1);
    const wrapper2 = moxy(() => () => 2);
    wrapper1.mock.wrap(trackCurriedFunction());
    wrapper2.mock.wrap(trackCurriedFunction());

    mock.wrapOnce(wrapper1);
    expect(moxied(1, 2, 3)).toBe(1);
    expect(moxied(1, 2, 3)).toBe(0);

    expect(wrapper1.mock.getCalls().length).toBe(1);
    expect(wrapper1.mock.getCalls()[0].args[0]).toEqual([source, mock]);
    expect(wrapper1.mock.getCalls()[0].args[1]).toEqual([1, 2, 3]);
    expect(wrapper1.mock.getCalls()[0].result).toBe(1);

    mock.wrapOnce(wrapper1).wrap(wrapper2);

    expect(moxied()).toBe(1);
    expect(moxied()).toBe(2);
    expect(moxied()).toBe(2);
    expect(wrapper1.mock.getCalls().length).toBe(2);
    expect(wrapper2.mock.getCalls().length).toBe(2);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  test('.fake(impl) mock function implementation', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    const impletation = () => 1;
    mock.fake(impletation);

    expect(moxied()).toBe(1);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('.fakeWhenArgs(matcher, impl) mock function implementation when args match', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    const matcher = moxy((n: number) => n % 2 === 0);
    const impl = moxy(() => 1);
    mock.fakeWhenArgs(matcher, impl);

    expect(moxied(2)).toBe(1);
    expect(moxied(1)).toBe(0);

    expect(matcher.mock.getCalls()).toEqual([
      new Call({ args: [2], result: true }),
      new Call({ args: [1], result: false }),
    ]);

    expect(impl.mock.getCalls()).toEqual([new Call({ args: [2], result: 1 })]);

    mock.fakeReturnValue(2).fakeWhenArgs(matcher, impl);

    expect(moxied(2)).toBe(1);
    expect(moxied(1)).toBe(2);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  test('.fakeOnce(impl) mock function implementation only once', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);
    const impletation = () => 1;
    const impletation1 = () => 2;
    const impletation2 = () => 3;

    mock.fakeOnce(impletation);
    expect(moxied()).toBe(1);
    expect(moxied()).toBe(0);

    mock
      .fake(impletation)
      .fakeOnce(impletation1)
      .fakeOnce(impletation2);
    expect(moxied()).toBe(2);
    expect(moxied()).toBe(3);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('.fakeReturnValue(val) mock the returned value', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeReturnValue(1);

    expect(moxied()).toBe(1);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('.fakeReturnValueOnce(val) mock return value only once ', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeReturnValueOnce(1);
    expect(moxied()).toBe(1);
    expect(moxied()).toBe(0);

    mock
      .fakeReturnValue(1)
      .fakeReturnValueOnce(2)
      .fakeReturnValueOnce(3);
    expect(moxied()).toBe(2);
    expect(moxied()).toBe(3);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });
});

describe('.setter(prop)', () => {
  it('returns mock instance of the setter', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const setFooMock = mock.setter('foo');
    expect(setFooMock).toBeInstanceOf(Mock);
    expect(mock.setterMocks.foo).toBe(setFooMock);
  });
});

describe('.getter(prop)', () => {
  it('returns a mock instance of the getter', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const getFooMock = mock.getter('foo');
    expect(getFooMock).toBeInstanceOf(Mock);
    expect(mock.getterMocks.foo).toBe(getFooMock);
  });
});

describe('.clear()', () => {
  it('return the mock itself', () => {
    const mock = new Mock();
    expect(mock.clear()).toBe(mock);
  });

  it('empty calls', () => {
    const mock = new Mock();
    const fn: any = mock.proxify(() => {});

    fn();
    fn();

    expect(mock.getCalls().length).toBe(2);

    mock.clear();
    expect(mock.getCalls()).toEqual([]);
  });

  it('empty proxified values cache', () => {
    const result = { foo: 'bar' };
    const mock = new Mock({ mockReturn: true });
    const fn: any = mock.proxify(() => result);

    const r1 = fn();
    expect(r1).toEqual(result);
    expect(r1).not.toBe(result);
    expect(fn()).toBe(r1);
    expect(fn.mock.getCalls().length).toBe(2);

    fn.mock.clear();
    expect(fn.mock.getCalls().length).toBe(0);

    const r2 = fn();
    expect(r2).toEqual(result);
    expect(r2).not.toBe(result);
    expect(fn()).toBe(r2);
    expect(r2).not.toBe(r1);
  });

  it('clear mocks of the properties included', () => {
    const mock = new Mock();
    const obj: any = mock.proxify({ foo: () => 'bar' });

    const { foo: moxiedFoo } = obj;
    expect(isMoxy(moxiedFoo)).toBe(true);

    expect(moxiedFoo()).toBe('bar');
    expect(moxiedFoo.mock.getCalls().length).toBe(1);

    moxiedFoo.mock.fakeReturnValue('baz');
    expect(moxiedFoo()).toBe('baz');
    expect(moxiedFoo.mock.getCalls().length).toBe(2);

    mock.clear();
    expect(obj.foo).toBe(moxiedFoo);
    expect(moxiedFoo.mock.getCalls().length).toBe(0);
    expect(moxiedFoo()).toBe('baz');
  });

  it('keep faked implementations', () => {
    const mock = new Mock();
    const fn: any = mock.proxify(() => {});

    mock.fake(() => 0);
    fn();
    mock.fakeOnce(() => 1);

    mock.clear();
    expect(fn()).toBe(1);
    expect(fn()).toBe(0);
  });

  it('clear setterMocks and getterMocks', () => {
    const mock = new Mock({ recordGetter: true, recordSetter: true });
    const moxied: any = mock.proxify(() => {});

    moxied.foo = 'bar';
    expect(moxied.foo).toBe('bar');

    const fooSetterMock = mock.setter('foo');
    const fooGetterMock = mock.getter('foo');
    expect(fooSetterMock.getCalls().length).toBe(1);
    expect(fooGetterMock.getCalls().length).toBe(1);

    mock.clear();

    expect({}.hasOwnProperty.call(mock.setterMocks, 'foo')).toBe(true);
    expect({}.hasOwnProperty.call(mock.getterMocks, 'foo')).toBe(true);

    expect(mock.setter('foo').getCalls()).toEqual([]);
    expect(mock.getter('foo').getCalls()).toEqual([]);

    expect(mock.setter('foo')).toBe(fooSetterMock);
    expect(mock.getter('foo')).toBe(fooGetterMock);
  });
});

describe('.reset()', () => {
  it('return the mock itself', () => {
    const mock = new Mock();
    expect(mock.clear()).toBe(mock);
  });

  it('empty calls', () => {
    const mock = new Mock();
    const fn: any = mock.proxify(() => {});

    fn();
    fn();

    expect(mock.getCalls().length).toBe(2);

    mock.reset();
    expect(mock.getCalls()).toEqual([]);
  });

  it('cleans cache of proxified values', () => {
    const mock = new Mock({ mockReturn: true });
    const fixed = {};
    const fn: any = mock.proxify(() => fixed);

    const returned1 = fn();
    const returned2 = fn();

    expect(isMoxy(returned1)).toBe(true);
    expect(returned1).toBe(returned2);

    mock.reset();
    expect(fn()).not.toBe(returned1);
  });

  it('clean cache of proxified props', () => {
    const mock = new Mock();
    const obj: any = mock.proxify({ foo: () => 'bar' });

    const moxiedFoo = obj.foo;
    expect(isMoxy(moxiedFoo)).toBe(true);
    expect(moxiedFoo()).toBe('bar');

    moxiedFoo.mock.fakeReturnValue('baz');
    expect(moxiedFoo()).toBe('baz');

    mock.reset();
    expect(obj.foo()).toBe('bar');
    expect(obj.foo).not.toBe(moxiedFoo);
  });

  it('empty setterMocks and getterMocks', () => {
    const mock = new Mock({ recordGetter: true, recordSetter: true });
    const moxied: any = mock.proxify(() => {});

    moxied.foo = 'bar';
    expect(moxied.foo).toBe('bar');

    const fooSetterMock = mock.setter('foo');
    const fooGetterMock = mock.getter('foo');
    expect(fooSetterMock.getCalls().length).toBe(1);
    expect(fooGetterMock.getCalls().length).toBe(1);

    mock.reset();

    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});

    expect(mock.setter('foo')).not.toBe(fooSetterMock);
    expect(mock.getter('foo')).not.toBe(fooGetterMock);
    expect(mock.setter('foo').getCalls()).toEqual([]);
    expect(mock.getter('foo').getCalls()).toEqual([]);
  });

  it('empty faked implementations', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => {});

    mock.fake(() => 0);
    expect(moxied()).toBe(0);
    mock.fakeOnce(() => 1);

    mock.reset();

    expect(moxied()).toBe(undefined);
    expect(moxied()).toBe(undefined);
  });
});

describe('.handle()', () => {
  it('return proxy handler', () => {
    const mock = new Mock();
    const handler = mock.handle({});

    expect(typeof handler).toBe('object');
    expect('set' in handler).toBe(true);
    expect('get' in handler).toBe(true);
    expect('apply' in handler).toBe(true);
    expect('construct' in handler).toBe(true);
  });

  it('compose options.middlewares to get the final proxy handler', () => {
    const copy = (x: Record<string, any>) => Object.assign({}, x);
    const middlewares = [moxy(copy), moxy(copy), moxy(copy)];

    const mock = new Mock({ middlewares });

    const source = {};
    const handler = mock.handle(source);

    expect(middlewares[0].mock.getCalls().length).toBe(1);
    expect(middlewares[1].mock.getCalls().length).toBe(1);
    expect(middlewares[2].mock.getCalls().length).toBe(1);

    const middleware1Call = middlewares[0].mock.getCalls()[0];
    expect(typeof middleware1Call.args[0]).toBe('object');
    expect(middleware1Call.args[1]).toBe(source);
    expect(middleware1Call.args[2]).toBe(mock);

    const middleware2Call = middlewares[1].mock.getCalls()[0];
    expect(middleware2Call.args[0]).not.toBe(middleware1Call.args[0]);
    expect(middleware2Call.args[0]).toBe(middleware1Call.result);
    expect(middleware2Call.args[1]).toBe(source);
    expect(middleware2Call.args[2]).toBe(mock);

    const middleware3Call = middlewares[2].mock.getCalls()[0];
    expect(middleware3Call.args[0]).not.toBe(middleware2Call.args[0]);
    expect(middleware3Call.args[0]).toBe(middleware2Call.result);
    expect(middleware3Call.args[1]).toBe(source);
    expect(middleware3Call.args[2]).toBe(mock);

    expect(handler).toBe(middleware3Call.result);
  });

  it('throw if original method lost in middleware result', () => {
    const methodsShoudContain = Object.keys(new Mock().handle({}));

    methodsShoudContain.forEach(method => {
      const middleware = (handler: ProxyHandler<any>) => {
        const incomplete = Object.assign({}, handler);
        delete (incomplete as Record<string, unknown>)[method];
        return incomplete;
      };

      const mock = new Mock({ middlewares: [middleware] });
      expect(() => mock.handle({})).toThrow();
    });
  });

  describe('handler.get()', () => {
    it('returns the Mock instance when getting with options.accessKey', () => {
      const mock1 = new Mock();
      const moxied1: any = mock1.proxify({});

      expect(isMoxy(moxied1)).toBe(true);
      expect(moxied1.mock).toBe(mock1);
      expect('mock' in moxied1).toBe(false);

      const mock2 = new Mock({ accessKey: 'myMock' });
      const moxied2: any = mock2.proxify({});

      expect(isMoxy(moxied2)).toBe(true);
      expect(moxied2.mock).toBe(undefined);
      expect(moxied2.myMock).toBe(mock2);
      expect('myMock' in moxied1).toBe(false);

      const MOCK = Symbol('mock');
      const mock3 = new Mock({ accessKey: MOCK });
      const moxied3: any = mock3.proxify({});

      expect(isMoxy(moxied3)).toBe(true);
      expect(moxied3.mock).toBe(undefined);
      expect(moxied3[MOCK]).toBe(mock3);
      expect(MOCK in moxied1).toBe(false);
    });

    it('inheritant descendants should not be moxied', () => {
      const mock = new Mock();
      const father: any = mock.proxify({ foo: 'bar' });

      expect(isMoxy(father)).toBe(true);
      expect(father.mock).toBe(mock);
      expect(father.foo).toBe('bar');

      const child = Object.create(father);
      expect(isMoxy(child)).toBe(false);
      expect(child.mock).toBe(undefined);
      expect(child.foo).toBe('bar');

      const Mother: any = mock.proxify(
        class Mother {
          public static foo = 'bar';
        }
      );
      expect(isMoxy(Mother)).toBe(true);
      expect(Mother.mock).toBe(mock);
      expect(Mother.foo).toBe('bar');

      class Child extends Mother {}
      expect(isMoxy(Child)).toBe(false);
      expect(Child.mock).toBe(undefined);
      expect(Child.foo).toBe('bar');
    });

    it('not store getter calls if options.recordGetter set to false', () => {
      const mock = new Mock({ recordGetter: false });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const getFooMock = mock.getter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');

      expect(getFooMock.getCalls()).toEqual([]);
    });

    it('store getter calls if options.recordGetter set to true', () => {
      const mock = new Mock({ recordGetter: true });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const getFooMock = mock.getter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');

      expect(getFooMock.getCalls()).toEqual([
        new Call({ result: 'bar', instance: moxied }),
        new Call({ result: 'baz', instance: moxied }),
      ]);
    });

    it('mock the prop getter using #getter(prop)', () => {
      const mock = new Mock({ recordGetter: true });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const getFooMock = mock.getter('foo');

      expect(moxied.foo).toBe('bar');

      getFooMock.fake(() => 'car');
      getFooMock.fakeOnce(() => 'baz');

      expect(moxied.foo).toBe('baz');
      expect(moxied.foo).toBe('car');
      expect(moxied.foo).toBe('car');

      expect(getFooMock.getCalls()).toEqual([
        new Call({ result: 'bar', instance: moxied }),
        new Call({ result: 'baz', instance: moxied }),
        new Call({ result: 'car', instance: moxied }),
        new Call({ result: 'car', instance: moxied }),
      ]);

      getFooMock.reset();

      expect(moxied.foo).toBe('bar');
      expect(getFooMock.getCalls()).toEqual([
        new Call({ result: 'bar', instance: moxied }),
      ]);
    });

    it('proxify only function prop if mockMethod set to true', () => {
      const BAR = Symbol('BAR');
      const BAZ = Symbol('BAZ');

      const mock = new Mock({ mockMethod: true });
      const target = {
        foo: {},
        hello() {
          return 'world';
        },
        [BAR]: {},
        [BAZ]() {
          return 'BAZ';
        },
      };
      const moxied: any = mock.proxify(target);

      expect(moxied.foo).toBe(target.foo);
      expect(moxied.foo.mock).toBe(undefined);

      expect(moxied.hello).not.toBe(target.hello);
      expect(typeof moxied.hello).toBe('function');
      expect(moxied.hello()).toBe('world');

      expect(moxied.hello.mock).toBeInstanceOf(Mock);
      expect(moxied.hello.mock).not.toBe(mock);
      expect(moxied.hello.mock.options).toEqual(mock.options);

      moxied.hello.mock.fakeReturnValue('folks');
      expect(moxied.hello()).toBe('folks');

      expect(moxied[BAR]).toBe(target[BAR]);
      expect(moxied[BAR].mock).toBe(undefined);

      expect(moxied[BAZ]).not.toBe(target[BAZ]);
      expect(moxied[BAZ].mock).toBeInstanceOf(Mock);
      expect(moxied[BAZ]()).toBe('BAZ');
      expect(moxied[BAZ].mock).not.toBe(moxied.hello.mock);
      expect(moxied[BAZ].mock.options).toEqual(mock.options);
    });

    it('proxify only props within options.includeProperties if defined', () => {
      const BEAR = Symbol('BEAR');
      const BEER = Symbol('BEER');
      const mock = new Mock({
        mockMethod: false,
        includeProperties: ['ba*', BEER],
      });

      const target = {
        foo: {},
        bar: {},
        baz() {
          return 'BAZ';
        },
        [BEAR]: {},
        [BEER]: {},
        hello() {
          return 'WORLD';
        },
      };
      const moxied: any = mock.proxify(target);

      expect(moxied.foo).toBe(target.foo);
      expect(moxied.foo.mock).toBe(undefined);

      expect(moxied.bar).not.toBe(target.bar);
      expect(moxied.bar.mock).toBeInstanceOf(Mock);

      expect(moxied.baz).not.toBe(target.baz);
      expect(moxied.baz.mock).toBeInstanceOf(Mock);
      expect(moxied.baz()).toBe('BAZ');

      expect(moxied[BEAR]).toBe(target[BEAR]);
      expect(moxied[BEAR].mock).toBe(undefined);

      expect(moxied[BEER]).not.toBe(target[BEER]);
      expect(moxied[BEER].mock).toBeInstanceOf(Mock);

      expect(moxied.hello).toBe(target.hello);
      expect(moxied.hello.mock).toBe(undefined);
      expect(moxied.hello()).toBe('WORLD');
    });

    it('exclude props within options.excludeProperties', () => {
      const BEAR = Symbol('BEAR');
      const BEER = Symbol('BEER');
      const HELLO = Symbol('HELLO');

      const mock = new Mock({
        mockMethod: true,
        includeProperties: ['*', BEER, BEAR],
        excludeProperties: ['b*', BEER],
      });

      const target = {
        foo: {},
        bar: {},
        baz() {
          return 'BAZ';
        },
        [BEAR]: {},
        [BEER]: {},
        [HELLO]() {
          return 'WORLD';
        },
      };
      const moxied: any = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo.mock).toBeInstanceOf(Mock);

      expect(moxied.bar).toBe(target.bar);
      expect(moxied.bar.mock).toBe(undefined);

      expect(moxied.baz).toBe(target.baz);
      expect(moxied.baz.mock).toBe(undefined);
      expect(moxied.baz()).toBe('BAZ');

      expect(moxied[BEAR]).not.toBe(target[BEAR]);
      expect(moxied[BEAR].mock).toBeInstanceOf(Mock);

      expect(moxied[BEER]).toBe(target[BEER]);
      expect(moxied[BEER].mock).toBe(undefined);

      expect(moxied[HELLO]).not.toBe(target[HELLO]);
      expect(moxied[HELLO].mock).toBeInstanceOf(Mock);
      expect(moxied[HELLO]()).toBe('WORLD');
    });

    test('excludeProperties take presedence of includeProperties', () => {
      const BEER = Symbol('BEER');
      const mock = new Mock({
        mockMethod: true,
        includeProperties: ['foo', 'bar', BEER],
        excludeProperties: ['bar', 'baz', BEER],
      });

      const target = { foo: {}, bar: {}, baz: {}, [BEER]: {} };
      const moxied: any = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo.mock).toBeInstanceOf(Mock);

      expect(moxied.bar).toBe(target.bar);
      expect(moxied.bar.mock).toBe(undefined);

      expect(moxied.baz).toBe(target.baz);
      expect(moxied.baz.mock).toBe(undefined);

      expect(moxied[BEER]).toBe(target[BEER]);
      expect(moxied[BEER].mock).toBe(undefined);
    });

    it('get orginal method if mockMethod set to false', () => {
      const mock = new Mock({ mockMethod: false });
      const target = {
        foo: { bar: 'baz' },
        hello() {
          return 'world';
        },
      };
      const moxied: any = mock.proxify(target);

      expect(moxied.foo).toBe(target.foo);
      expect(moxied.foo.mock).toBe(undefined);

      expect(moxied.hello).toBe(target.hello);
      expect(moxied.hello.mock).toBe(undefined);
    });

    it('call original getter on source', () => {
      const mock = new Mock();
      const moxied: any = mock.proxify({
        _foo: 'bar',
        _fool: 'barz',
        get foo() {
          return this._foo;
        },
      });

      expect(moxied.foo).toBe('bar');

      moxied._foo = 'baz';
      expect(moxied.foo).toBe('baz');

      moxied.mock
        .getter('foo')
        .fake(function getFooled(this: { _fool: string }) {
          return this._fool;
        });
      expect(moxied.foo).toBe('barz');
    });

    it('does not proxify Function.prototype', () => {
      class Fn {
        public static someStaticMethod() {}
      }
      const fnMock = new Mock({ includeProperties: ['prototype'] });
      const MoxiedFn: any = fnMock.proxify(Fn);

      expect(MoxiedFn.mock).toBe(fnMock);
      expect(MoxiedFn.prototype.mock).toBe(undefined);
      expect(MoxiedFn.someStaticMethod.mock).toBeInstanceOf(Mock);

      const objMock = new Mock({ includeProperties: ['prototype'] });
      const moxiedObj: any = objMock.proxify({ prototype: {} });

      expect(moxiedObj.mock).toBe(objMock);
      expect(moxiedObj.prototype.mock).toBeInstanceOf(Mock);
    });
  });

  describe('handler.set()', () => {
    it('not store setter calls when options.recordSetter set to false', () => {
      const mock = new Mock({ recordSetter: false });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const setFooMock = mock.setter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');

      expect(setFooMock.getCalls()).toEqual([]);
    });

    it('store setter calls when options.recordSetter set to true', () => {
      const mock = new Mock({ recordSetter: true });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const setFooMock = mock.setter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');
      moxied.foo = 'rap';
      expect(moxied.foo).toBe('rap');

      expect(setFooMock.getCalls()).toEqual([
        new Call({ args: ['baz'], instance: moxied }),
        new Call({ args: ['rap'], instance: moxied }),
      ]);
    });

    test('mock setter behavier', () => {
      const mock = new Mock({ recordSetter: true });
      const moxied: any = mock.proxify({ foo: 'bar' });

      const setFooMock = mock.setter('foo');

      setFooMock.fake(function f1(this: { _foo: string }, val: string) {
        this._foo = (this._foo || '') + val;
      });

      setFooMock.fakeOnce(function f2(this: { _foo: string }, val: string) {
        this._foo = (this._foo || '') + val + val;
      });

      moxied.foo = 'foo';
      expect(moxied).toEqual({ foo: 'bar', _foo: 'foofoo' });

      moxied.foo = 'bar';
      moxied.foo = 'baz';
      expect(moxied).toEqual({ foo: 'bar', _foo: 'foofoobarbaz' });

      expect(setFooMock.getCalls()).toEqual([
        new Call({ args: ['foo'], instance: moxied }),
        new Call({ args: ['bar'], instance: moxied }),
        new Call({ args: ['baz'], instance: moxied }),
      ]);

      setFooMock.reset();

      moxied.foo = 'foooo';
      expect(moxied).toEqual({ foo: 'foooo', _foo: 'foofoobarbaz' });

      expect(setFooMock.getCalls()).toEqual([
        new Call({ args: ['foooo'], instance: moxied }),
      ]);
    });

    it('call the original setter on source', () => {
      const source = {
        _foo: 'bar',
        set foo(val: string) {
          this._foo = val;
        },
      };

      const mock = new Mock();
      const moxied: any = mock.proxify(source);

      moxied.foo = 'baz';
      expect(moxied._foo).toBe('baz');
      expect(source._foo).toBe('bar');

      moxied.mock
        .setter('foo')
        .fake(function setFool(this: { _fool: string }, val: string) {
          this._fool = val;
        });

      moxied.foo = 'barz';
      expect(moxied._fool).toBe('barz');
      expect('_fool' in source).toBe(false);
      expect(moxied._foo).toBe('baz');
      expect(source._foo).toBe('bar');

      expect(source.foo).toBe(undefined);
      expect(moxied.foo).toBe(undefined);
    });
  });

  describe('handler.construct()', () => {
    it('stores constructor calls', () => {
      const mock = new Mock();
      const Moxied: any = mock.proxify(function Klass() {});

      const moxied1 = new Moxied();
      const moxied2 = new Moxied(0, 1, 2);
      expect(moxied1).toBeInstanceOf(Moxied);
      expect(moxied2).toBeInstanceOf(Moxied);

      expect(Moxied.mock.getCalls()).toEqual([
        new Call({ instance: moxied1, isConstructor: true }),
        new Call({ args: [0, 1, 2], instance: moxied2, isConstructor: true }),
      ]);
    });

    it('mock an ES6 class', () => {
      class Foo {}
      const mock = new Mock();
      const MoxiedFoo: any = mock.proxify(Foo);

      const foo = new MoxiedFoo();

      expect(foo).toBeInstanceOf(Foo);
      expect(foo).toBeInstanceOf(MoxiedFoo);
      expect(Object.getPrototypeOf(foo)).toBe(Foo.prototype);
      expect(Object.getPrototypeOf(foo)).toBe(MoxiedFoo.prototype);
    });

    test('mock constructor implementation', () => {
      interface Foo {
        bar: string;
      }
      function Foo(this: Foo) {
        this.bar = 'baz';
      }

      const mock = new Mock();
      const MoxiedFoo: any = mock.proxify(Foo);

      const foo = new MoxiedFoo();
      expect(foo).toEqual({ bar: 'baz' });

      MoxiedFoo.mock.fake(function FakedFoo(this: Foo & { faked: true }) {
        this.faked = true;
      });
      expect(new MoxiedFoo()).toEqual({ faked: true });

      expect(foo).toBeInstanceOf(Foo);
      expect(foo).toBeInstanceOf(MoxiedFoo);

      expect(MoxiedFoo.mock.getCalls()).toEqual([
        new Call({ isConstructor: true, instance: { bar: 'baz' } }),
        new Call({ isConstructor: true, instance: { faked: true } }),
      ]);
    });

    test('proxify plain object return by faked constructor', () => {
      interface Foo {
        bar: string;
      }
      function Foo(this: Foo) {
        this.bar = 'baz';
      }

      const mock = new Mock();
      const MoxiedFoo: any = mock.proxify(Foo);

      MoxiedFoo.mock.fake(function f() {
        return { faked: true };
      });

      const foo = new MoxiedFoo();
      expect(foo).toEqual({ faked: true });

      expect(foo).not.toBeInstanceOf(Foo);
      expect(foo).not.toBeInstanceOf(MoxiedFoo);
      expect(Object.getPrototypeOf(foo)).toBe(Object.prototype);

      expect(MoxiedFoo.mock.getCalls()).toEqual([
        new Call({ isConstructor: true, instance: { faked: true } }),
      ]);
    });

    it('store thrown constructor calls', () => {
      function Foo() {
        throw new Error('bad instance!');
      }

      const mock = new Mock();
      const MoxiedFoo: any = mock.proxify(Foo);

      expect(() => new MoxiedFoo()).toThrow('bad instance!');
      expect(() => new MoxiedFoo("i'm good")).toThrow('bad instance!');

      MoxiedFoo.mock.fake(function f() {
        throw new Error('really bad instance!');
      });
      expect(() => new MoxiedFoo()).toThrow('really bad instance!');
      expect(() => new MoxiedFoo("i'm good")).toThrow('really bad instance!');

      expect(MoxiedFoo.mock.getCalls()).toEqual([
        new Call({
          isConstructor: true,
          instance: undefined,
          isThrown: true,
          result: new Error('bad instance!'),
        }),
        new Call({
          args: ["i'm good"],
          isConstructor: true,
          instance: undefined,
          isThrown: true,
          result: new Error('bad instance!'),
        }),
        new Call({
          isConstructor: true,
          instance: undefined,
          isThrown: true,
          result: new Error('really bad instance!'),
        }),
        new Call({
          args: ["i'm good"],
          isConstructor: true,
          instance: undefined,
          isThrown: true,
          result: new Error('really bad instance!'),
        }),
      ]);
    });

    it('proxify new instance if options.mockNewInstance set to true', () => {
      class Foo {
        // eslint-disable-next-line class-methods-use-this
        public bar() {
          return 'baz';
        }
      }

      const mock = new Mock();
      const MoxiedFoo: any = mock.proxify(Foo);

      const foo1 = new MoxiedFoo();
      expect(foo1).toEqual({});
      expect(foo1.mock).toBeInstanceOf(Mock);
      expect(foo1.mock).not.toBe(mock);
      expect(foo1.mock.options).toEqual(mock.options);

      expect(foo1.bar()).toBe('baz');
      expect(foo1.bar.mock.getCalls()).toEqual([
        new Call({ result: 'baz', instance: foo1 }),
      ]);

      mock.fake(function FakedFoo(this: Foo & { faked: true }) {
        this.faked = true;
      });

      const foo2 = new MoxiedFoo();
      expect(foo2).toEqual({ faked: true });
      expect(foo2.mock).toBeInstanceOf(Mock);
      expect(foo2.mock).not.toBe(mock);
      expect(foo2.mock.options).toEqual(mock.options);
    });

    it('not proxify new instance if options.mockNewInstance set to false', () => {
      class Foo {
        // eslint-disable-next-line class-methods-use-this
        public bar() {
          return 'baz';
        }
      }
      const mock = new Mock({ mockNewInstance: false });
      const MoxiedFoo: any = mock.proxify(Foo);

      const foo = new MoxiedFoo();

      expect(foo).toBeInstanceOf(Foo);
      expect(foo).toBeInstanceOf(MoxiedFoo);
      expect(foo.mock).toBe(undefined);
      expect(foo.bar.mock).toBe(undefined);
    });
  });

  describe('handler.apply()', () => {
    it('store function calls', () => {
      const mock = new Mock();
      const moxied: any = mock.proxify((x: string) => `hello ${x}`);

      expect(moxied()).toBe('hello undefined');
      expect(moxied('world')).toBe('hello world');
      expect(moxied(1, 2, 3)).toBe('hello 1');

      expect(moxied.mock.getCalls()).toEqual([
        new Call({ result: 'hello undefined' }),
        new Call({ args: ['world'], result: 'hello world' }),
        new Call({ args: [1, 2, 3], result: 'hello 1' }),
      ]);
    });

    it('mock function implementations', () => {
      const mock = new Mock();
      const moxied: any = mock.proxify((x: string) => `hello ${x}`);

      expect(moxied('world')).toBe('hello world');

      // prettier-ignore
      const reverse = (str: string) => str.split('').reverse().join('');
      moxied.mock.fake((x: string) => `hello ${reverse(x)}`);

      expect(moxied('world')).toBe('hello dlrow');
      expect(moxied('there')).toBe('hello ereht');

      expect(moxied.mock.getCalls()).toEqual([
        new Call({ args: ['world'], result: 'hello world' }),
        new Call({ args: ['world'], result: 'hello dlrow' }),
        new Call({ args: ['there'], result: 'hello ereht' }),
      ]);
    });

    it('store thrown function calls', () => {
      const mock = new Mock();
      const moxied: any = mock.proxify(() => {
        throw new Error('bad');
      });

      expect(() => moxied()).toThrow('bad');
      expect(() => moxied('good')).toThrow('bad');

      moxied.mock.fake(() => {
        throw new Error('bad!bad!bad!');
      });

      expect(() => moxied()).toThrow('bad!bad!bad!');
      expect(() => moxied('good')).toThrow('bad!bad!bad!');

      expect(moxied.mock.getCalls()).toEqual([
        new Call({ isThrown: true, result: new Error('bad') }),
        new Call({ args: ['good'], isThrown: true, result: new Error('bad') }),
        new Call({ isThrown: true, result: new Error('bad!bad!bad!') }),
        new Call({
          args: ['good'],
          isThrown: true,
          result: new Error('bad!bad!bad!'),
        }),
      ]);
    });

    it('proxify object return value if options.mockReturn set to true', () => {
      const result = { foo: 'bar' };
      const mock = new Mock({ mockReturn: true });
      const fn: any = mock.proxify(() => result);

      const r1 = fn();
      expect(r1).toEqual(result);
      expect(r1).not.toBe(result);
      expect(r1).toBe(fn());
      expect(r1.mock).toBeInstanceOf(Mock);
      expect(r1.mock.options).toEqual(mock.options);
      expect(r1.mock).not.toBe(mock);

      const fakeResult = { foo: 'baz' };
      mock.fakeReturnValue(fakeResult);

      const r2 = fn();
      expect(r2).toEqual(fakeResult);
      expect(r2).not.toBe(fakeResult);
      expect(r2).toBe(fn());
      expect(r2.mock).toBeInstanceOf(Mock);
      expect(r2.mock.options).toEqual(mock.options);
      expect(r2.mock).not.toBe(mock);
      expect(r2.mock).not.toBe(r1.mock);
    });

    it('proxify function return value if options.mockReturn set to true', () => {
      const mock = new Mock({ mockReturn: true });
      const moxied: any = mock.proxify((a: number) => (b: number) => a + b);

      const fn1 = moxied(1);
      expect(fn1(2)).toBe(3);

      expect(fn1.mock).toBeInstanceOf(Mock);
      expect(fn1.mock.options).toEqual(mock.options);
      expect(fn1.mock).not.toBe(mock);

      mock.fakeReturnValue(() => 999);
      const fn2 = moxied(2);
      expect(fn2(3)).toBe(999);

      expect(fn2.mock).toBeInstanceOf(Mock);
      expect(fn2.mock.options).toEqual(mock.options);
      expect(fn2.mock).not.toBe(mock);
      expect(fn2.mock).not.toBe(fn1.mock);
    });

    it('proxify the promise resolved value but not promise itself', async () => {
      const result = { hello: 'world' };
      const promise = Promise.resolve(result);

      const mock = new Mock({ mockReturn: true });
      const moxied: any = mock.proxify(() => promise);

      expect(moxied()).toBeInstanceOf(Promise);
      expect(isMoxy(moxied())).toBe(false);

      await expect(moxied()).resolves.not.toBe(result);
      await expect(moxied()).resolves.toEqual(result);

      const r = await moxied();

      expect(isMoxy(r)).toBe(true);
      expect(r.mock).toBeInstanceOf(Mock);
    });

    it('not proxify promise rejected value', async () => {
      const result = { something: 'wrong' };
      const promise = Promise.reject(result);
      const moxied = moxy();

      moxied.mock.fake(() => promise);

      await expect(moxied()).rejects.toBe(result);
      await expect(moxied()).rejects.not.toBe(undefined);
    });

    it('not re-proxify if returned value is already a moxy', () => {
      const returnedValue = moxy({});

      const mock = new Mock();
      const moxied: any = mock.proxify(() => returnedValue);

      expect(moxied()).toBe(returnedValue);
      expect(moxied.mock.getCalls()[0].result).toBe(returnedValue);
    });

    it('not proxify retrun value if options.mockReturn set to false', () => {
      const retrunedObj = {};
      const mock = new Mock({ mockReturn: false });
      const moxied: any = mock.proxify(() => retrunedObj);

      expect(moxied()).toBe(retrunedObj);
      expect(moxied().mock).toBe(undefined);

      const returnedFn = () => {};
      mock.fakeReturnValue(returnedFn);

      expect(moxied()).toBe(returnedFn);
      expect(moxied().mock).toBe(undefined);
    });
  });

  describe('handler.getOwnPropertyDescriptor()', () => {
    it('returns descriptor of source if not defined at double', () => {
      const mock = new Mock();
      const source = { foo: 'bar' };

      const moxied = mock.proxify(source);

      expect(Object.getOwnPropertyDescriptor(moxied, 'foo')).toEqual({
        value: 'bar',
        enumerable: true,
        configurable: true,
        writable: true,
      });
    });

    it('returns descriptor of source as configurable', () => {
      const mock = new Mock();
      const source = {};
      Object.defineProperty(source, 'foo', {
        value: 'bar',
        enumerable: false,
        configurable: false,
        writable: false,
      });

      const moxied = mock.proxify(source);

      expect(Object.getOwnPropertyDescriptor(moxied, 'foo')).toEqual({
        value: 'bar',
        enumerable: false,
        configurable: true,
        writable: false,
      });
    });

    it('returns descriptor of the target prior to source', () => {
      const mock = new Mock();
      const source = { foo: 'bar' };

      const moxied = mock.proxify(source);

      Object.defineProperty(moxied, 'foo', {
        value: 'baz',
        enumerable: true,
      });

      expect(Object.getOwnPropertyDescriptor(moxied, 'foo')).toEqual({
        value: 'baz',
        enumerable: true,
        configurable: false,
        writable: false,
      });
    });

    it('returns undefined when prop do not exist on double and source', () => {
      const mock = new Mock();
      const source = { foo: 'bar' };

      const moxied = mock.proxify(source);
      expect(Object.getOwnPropertyDescriptor(moxied, 'bar')).toBe(undefined);
    });
  });

  describe('handler.ownKeys()', () => {
    it('returns both target and source keys', () => {
      const mock = new Mock();
      const source = { foo: 'foo', bar: 'bar' };

      const moxied: any = mock.proxify(source);
      moxied.baz = 'baz';
      moxied.foo = 'fool';

      const keys = Reflect.ownKeys(moxied);
      expect(keys.length).toBe(3);
      expect(keys).toEqual(expect.arrayContaining(['foo', 'bar', 'baz']));
    });
  });

  describe('other handler method', () => {
    it('work normally', () => {
      class Foo {}
      const mock = new Mock();
      const moxied: any = mock.proxify(new Foo());

      const fooDescriptor = {
        configurable: true,
        writable: true,
        enumerable: true,
        value: 'bar',
      };

      Object.defineProperty(moxied, 'foo', fooDescriptor);

      const fooSym = Symbol('foo');
      Object.defineProperty(moxied, fooSym, { value: 'bar' });

      expect(moxied.foo).toBe('bar');
      expect(moxied[fooSym]).toBe('bar');

      expect('foo' in moxied).toBe(true);
      expect(fooSym in moxied).toBe(true);

      expect(Object.keys(moxied)).toEqual(['foo']);
      expect(Object.getOwnPropertyNames(moxied)).toEqual(['foo']);
      expect(Object.getOwnPropertySymbols(moxied)).toEqual([fooSym]);

      expect(Object.getOwnPropertyDescriptor(moxied, 'foo')).toEqual(
        fooDescriptor
      );

      expect(Object.getOwnPropertyDescriptor(moxied, fooSym)).toEqual({
        value: 'bar',
        enumerable: false,
        configurable: false,
        writable: false,
      });

      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');

      expect(() => {
        moxied[fooSym] = 'baz';
      }).toThrow();
      expect(moxied[fooSym]).toBe('bar');

      expect(delete moxied.foo).toBe(true);
      expect('foo' in moxied).toBe(false);

      expect(() => delete moxied[fooSym]).toThrow();
      expect(fooSym in moxied).toBe(true);

      expect(moxied).toBeInstanceOf(Foo);
      expect(Object.getPrototypeOf(moxied)).toBe(Foo.prototype);

      class Fool {}
      Object.setPrototypeOf(moxied, Fool.prototype);

      expect(moxied).toBeInstanceOf(Fool);
      expect(Object.getPrototypeOf(moxied)).toBe(Fool.prototype);

      expect(Object.isExtensible(moxied)).toBe(true);

      Object.preventExtensions(moxied);
      expect(Object.isExtensible(moxied)).toBe(false);
    });
  });
});
