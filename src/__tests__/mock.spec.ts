import moxy from '..';
import Call from '../call';
import Mock from '../mock';

declare let global: { Proxy: any };

it('is a constructor', () => {
  expect(typeof Mock).toBe('function');
  expect(() => new Mock()).not.toThrow();
});

describe('#constructor(options)', () => {
  it('configures options with default value', () => {
    expect(new Mock().options).toEqual({
      accessKey: 'mock',
      middlewares: null,
      proxifyReturnValue: true,
      proxifyNewInstance: true,
      proxifyProperties: true,
      includeProperties: null,
      excludeProperties: null,
    });

    const fullOptions = {
      accessKey: 'MOCK',
      middlewares: [handler => handler],
      proxifyReturnValue: false,
      proxifyNewInstance: false,
      proxifyProperties: false,
      includeProperties: ['foo'],
      excludeProperties: ['bar'],
    };
    expect(new Mock(fullOptions).options).toEqual(fullOptions);

    expect(
      new Mock({
        accessKey: 'moooock',
        proxifyReturnValue: false,
        includeProperties: ['foo', 'bar'],
      }).options
    ).toEqual({
      accessKey: 'moooock',
      middlewares: null,
      proxifyReturnValue: false,
      proxifyNewInstance: true,
      proxifyProperties: true,
      includeProperties: ['foo', 'bar'],
      excludeProperties: null,
    });
  });

  it('initiate basic props', () => {
    const mock = new Mock();

    expect(mock.calls).toEqual([]);
    expect(mock.impletationQueue).toEqual([]);
    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});
  });
});

describe('#poxify(source, mock)', () => {
  const _Proxy = global.Proxy;

  afterEach(() => {
    global.Proxy = _Proxy;
  });

  it('returns new Proxy(target, mock.handle()) with transfromed empty target', () => {
    const handler = { apply() {} };
    const mockInstance = moxy(new Mock(), {
      proxifyReturnValue: false,
      includeProperties: ['handle'],
    });
    mockInstance.handle.mock.fakeReturnValue(handler);

    global.Proxy = moxy(class {}, {
      proxifyNewInstance: false,
      proxifyProperties: false,
    });

    const fn = () => {};
    const moxiedFn = mockInstance.proxify(fn);

    const obj = {};
    const moxiedObj = mockInstance.proxify(obj);

    expect(mockInstance.handle.mock.calls).toEqual([
      new Call({ instance: mockInstance, result: handler }),
      new Call({ instance: mockInstance, result: handler }),
    ]);

    expect(global.Proxy.mock.calls.length).toBe(2);

    const fnCall = global.Proxy.mock.calls[0];
    expect(typeof fnCall.args[0]).toBe('function');
    expect(fnCall.args[0](1, 2, 3)).toBe(undefined);
    expect(fnCall.args[1]).toBe(handler);
    expect(fnCall).toEqual(
      expect.objectContaining({
        isThrow: false,
        isConstructor: true,
        instance: moxiedFn,
        result: undefined,
      })
    );

    expect(global.Proxy.mock.calls[1]).toEqual({
      args: [{}, handler],
      isThrow: false,
      isConstructor: true,
      instance: moxiedObj,
      result: undefined,
    });
  });
});

describe('#calls()', () => {
  it('returns a copy of _call', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => {});

    moxied();
    const { calls } = mock;
    expect(calls).toEqual([new Call()]);

    moxied();
    expect(calls.length).toBe(1);
  });
});

describe(`Faking implementation
  #fake(impl)
  #fakeOnce(impl)
  #fakeReturnValue(val)
  #fakeReturnValueOnce(val)
`, () => {
  it('invoke original target if not faked', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => 0);

    expect(moxied()).toBe(0);
  });

  it('invoke faked implementation if #fake(impl)', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => 0);

    const faked = () => 1;
    mock.fake(faked);

    expect(moxied()).toBe(1);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('invoke fake implementation from #fakeOnce(impl) only once', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => 0);
    const faked = () => 1;
    const faked1 = () => 2;
    const faked2 = () => 3;

    mock.fakeOnce(faked);
    expect(moxied()).toBe(1);
    expect(moxied()).toBe(0);

    mock.fake(faked);
    mock.fakeOnce(faked1);
    mock.fakeOnce(faked2);
    expect(moxied()).toBe(2);
    expect(moxied()).toBe(3);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  it('#fakeReturnValue(val) is equivelant to #fake(() => val)', () => {
    const mock = moxy(new Mock());

    const faked = {};
    mock.fakeReturnValue(faked);

    expect(mock.fake.mock.calls.length).toBe(1);
    expect(mock.fake.mock.calls[0].args.length).toBe(1);

    const fakedFn = mock.fake.mock.calls[0].args[0];
    expect(typeof fakedFn).toBe('function');
    expect(fakedFn()).toBe(faked);
  });

  it('#fakeReturnValueOnce(val) is equivelant to #fakeOnce(() => val)', () => {
    const mock = moxy(new Mock(), {
      includeProperties: ['fakeOnce'],
    });

    const faked = {};
    mock.fakeReturnValueOnce(faked);

    expect(mock.fakeOnce.mock.calls.length).toBe(1);
    expect(mock.fakeOnce.mock.calls[0].args.length).toBe(1);

    const fakeOnceFn = mock.fakeOnce.mock.calls[0].args[0];
    expect(typeof fakeOnceFn).toBe('function');
    expect(fakeOnceFn()).toBe(faked);
  });
});

describe(`#setter(prop)`, () => {
  it('returns mock instance of setter lazily created', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const setFooMock = mock.setter('foo');
    expect(setFooMock).toBeInstanceOf(Mock);
    expect(mock.setterMocks.foo).toBe(setFooMock);
  });
});

describe(`#getter(prop)`, () => {
  it('returns mock instance of getter lazily created', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const getFooMock = mock.getter('foo');
    expect(getFooMock).toBeInstanceOf(Mock);
    expect(mock.getterMocks.foo).toBe(getFooMock);
  });
});

describe('#clear()', () => {
  let mock;
  let moxied;
  beforeEach(() => {
    mock = new Mock();
    moxied = mock.proxify(() => {});
  });

  it('empty calls', () => {
    moxied();
    moxied();

    expect(mock.calls.length).toBe(2);

    mock.clear();
    expect(mock.calls).toEqual([]);
  });

  it('empty proxified values cached', () => {
    const fixed = {};
    mock.fakeReturnValue(fixed);

    const returned1 = moxied();
    const returned2 = moxied();

    expect(returned1).toBe(returned2);

    mock.clear();
    expect(moxied()).not.toBe(returned1);
  });

  it('keep faked implementations', () => {
    mock.fake(() => 0);
    moxied();
    mock.fakeOnce(() => 1);

    mock.clear();
    expect(moxied()).toBe(1);
    expect(moxied()).toBe(0);
  });

  it('clear all setterMocks and getterMocks too', () => {
    moxied.foo = 'bar';
    expect(moxied.foo).toBe('bar');

    const fooSetterMock = mock.setter('foo');
    const fooGetterMock = mock.getter('foo');
    expect(fooSetterMock.calls.length).toBe(1);
    expect(fooGetterMock.calls.length).toBe(1);

    mock.clear();

    expect({}.hasOwnProperty.call(mock.setterMocks, 'foo')).toBe(true);
    expect({}.hasOwnProperty.call(mock.getterMocks, 'foo')).toBe(true);

    expect(mock.setter('foo').calls).toEqual([]);
    expect(mock.getter('foo').calls).toEqual([]);

    expect(mock.setter('foo')).toBe(fooSetterMock);
    expect(mock.getter('foo')).toBe(fooGetterMock);
  });
});

describe('#reset()', () => {
  let mock;
  let moxied;
  beforeEach(() => {
    mock = new Mock();
    moxied = mock.proxify(() => {});
  });

  it('empty calls', () => {
    moxied();
    moxied();

    expect(mock.calls.length).toBe(2);

    mock.reset();
    expect(mock.calls).toEqual([]);
  });

  it('empty proxifiedCache', () => {
    const fixed = {};
    mock.fakeReturnValue(fixed);

    const returned1 = moxied();
    const returned2 = moxied();

    expect(returned1).toBe(returned2);

    mock.reset();
    expect(moxied()).not.toBe(returned1);
  });

  it('empty setterMocks and getterMocks', () => {
    moxied.foo = 'bar';
    expect(moxied.foo).toBe('bar');

    const fooSetterMock = mock.setter('foo');
    const fooGetterMock = mock.getter('foo');
    expect(fooSetterMock.calls.length).toBe(1);
    expect(fooGetterMock.calls.length).toBe(1);

    mock.reset();

    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});

    expect(mock.setter('foo')).not.toBe(fooSetterMock);
    expect(mock.getter('foo')).not.toBe(fooGetterMock);
    expect(mock.setter('foo').calls).toEqual([]);
    expect(mock.getter('foo').calls).toEqual([]);
  });

  it('empties fake impletations', () => {
    mock.fake(() => 0);
    expect(moxied()).toBe(0);
    mock.fakeOnce(() => 1);

    mock.reset();

    expect(moxied()).toBe(undefined);
    expect(moxied()).toBe(undefined);
  });
});

describe('#handle()', () => {
  describe('handler.get()', () => {
    it('returns the mock itself if getting options.accessKey', () => {
      const mock1 = new Mock();
      const moxied1 = mock1.proxify({});

      expect(moxied1.mock).toBe(mock1);
      expect('mock' in moxied1).toBe(false);

      const mock2 = new Mock({ accessKey: 'myMock' });
      const moxied2 = mock2.proxify({});

      expect(moxied2.mock).toBe(undefined);
      expect(moxied2.myMock).toBe(mock2);
      expect('myMock' in moxied1).toBe(false);

      const MOCK = Symbol('mock');
      const mock3 = new Mock({ accessKey: MOCK });
      const moxied3 = mock3.proxify({});

      expect(moxied3.mock).toBe(undefined);
      expect(moxied3[MOCK]).toBe(mock3);
      expect(MOCK in moxied1).toBe(false);
    });

    it('store getting prop record as getter calls at #getter(prop)', () => {
      const mock = new Mock();
      const moxied = mock.proxify({ foo: 'bar' });

      const getFooMock = mock.getter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');

      expect(getFooMock.calls).toEqual([
        new Call({ result: 'bar', instance: moxied }),
        new Call({ result: 'baz', instance: moxied }),
      ]);
    });

    it('mock the prop value get by fake implementation at #getter(prop)', () => {
      const mock = new Mock();
      const moxied = mock.proxify({ foo: 'bar' });

      const getFooMock = mock.getter('foo');

      expect(moxied.foo).toBe('bar');

      getFooMock.fake(() => 'car');
      getFooMock.fakeOnce(() => 'baz');

      expect(moxied.foo).toBe('baz');
      expect(moxied.foo).toBe('car');
      expect(moxied.foo).toBe('car');

      expect(getFooMock.calls).toEqual([
        new Call({ result: 'bar', instance: moxied }),
        new Call({ result: 'baz', instance: moxied }),
        new Call({ result: 'car', instance: moxied }),
        new Call({ result: 'car', instance: moxied }),
      ]);

      getFooMock.reset();

      expect(moxied.foo).toBe('bar');
      expect(getFooMock.calls).toEqual([
        new Call({ result: 'bar', instance: moxied }),
      ]);
    });

    it('proxify object or function prop if proxifyProperties set to true', () => {
      const mock = new Mock({ proxifyProperties: true });
      const target = {
        foo: { bar: 'baz' },
        hello() {
          return 'world';
        },
      };
      const moxied = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo).toEqual({ bar: 'baz' });

      expect(moxied.foo.mock).toBeInstanceOf(Mock);
      expect(moxied.foo.mock).not.toBe(mock);
      expect(moxied.foo.mock.options).toEqual(mock.options);

      moxied.foo.mock.getter('bar').fakeReturnValue('zebra');
      expect(moxied.foo.bar).toBe('zebra');

      expect(moxied.hello).not.toBe(target.hello);
      expect(typeof moxied.hello).toBe('function');
      expect(moxied.hello()).toBe('world');

      expect(moxied.hello.mock).toBeInstanceOf(Mock);
      expect(moxied.hello.mock).toBeInstanceOf(Mock);
      expect(moxied.hello.mock).not.toBe(mock);
      expect(moxied.hello.mock).not.toBe(moxied.foo.mock);
      expect(moxied.hello.mock.options).toEqual(mock.options);

      moxied.hello.mock.fakeReturnValue('fulk');
      expect(moxied.hello()).toBe('fulk');
    });

    it('proxify only props in includeProperties if defined', () => {
      const mock = new Mock({
        proxifyProperties: true,
        includeProperties: ['foo'],
      });

      const target = { foo: {}, bar: {} };
      const moxied = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo.mock).toBeInstanceOf(Mock);

      expect(moxied.bar).toBe(target.bar);
      expect(moxied.bar.mock).toBe(undefined);
    });

    it('proxify excluding props in excludeProperties if defined', () => {
      const mock = new Mock({
        proxifyProperties: true,
        excludeProperties: ['bar'],
      });

      const target = { foo: {}, bar: {} };
      const moxied = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo.mock).toBeInstanceOf(Mock);

      expect(moxied.bar).toBe(target.bar);
      expect(moxied.bar.mock).toBe(undefined);
    });

    test('excludeProperties should take presedence of includeProperties', () => {
      const mock = new Mock({
        proxifyProperties: true,
        includeProperties: ['foo', 'bar'],
        excludeProperties: ['bar', 'baz'],
      });

      const target = { foo: {}, bar: {}, baz: {} };
      const moxied = mock.proxify(target);

      expect(moxied.foo).not.toBe(target.foo);
      expect(moxied.foo.mock).toBeInstanceOf(Mock);

      expect(moxied.bar).toBe(target.bar);
      expect(moxied.bar.mock).toBe(undefined);

      expect(moxied.baz).toBe(target.baz);
      expect(moxied.baz.mock).toBe(undefined);
    });

    it('returns orginal prop if proxifyProperties set to false', () => {
      const mock = new Mock({ proxifyProperties: false });
      const target = {
        foo: { bar: 'baz' },
        hello() {
          return 'world';
        },
      };
      const moxied = mock.proxify(target);

      expect(moxied.foo).toBe(target.foo);
      expect(moxied.foo.mock).toBe(undefined);

      expect(moxied.hello).toBe(target.hello);
      expect(moxied.hello.mock).toBe(undefined);
    });

    it('does not proxify Function.prototype', () => {
      class Fn {
        static someStaticMethod() {}
      }
      const fnMock = new Mock();
      const MoxiedFn = fnMock.proxify(Fn);

      expect(MoxiedFn.mock).toBe(fnMock);
      expect(MoxiedFn.prototype.mock).toBe(undefined);
      expect(MoxiedFn.someStaticMethod.mock).toBeInstanceOf(Mock);

      const objMock = new Mock();
      const moxiedObj = objMock.proxify({ prototype: {} });

      expect(moxiedObj.mock).toBe(objMock);
      expect(moxiedObj.prototype.mock).toBeInstanceOf(Mock);
    });
  });

  describe('handler.set()', () => {
    it('store props setting as setter calls in #setter(prop)', () => {
      const mock = new Mock();
      const moxied = mock.proxify({ foo: 'bar' });

      const setFooMock = mock.setter('foo');

      expect(moxied.foo).toBe('bar');
      moxied.foo = 'baz';
      expect(moxied.foo).toBe('baz');
      moxied.foo = 'rap';
      expect(moxied.foo).toBe('rap');

      expect(setFooMock.calls).toEqual([
        new Call({ args: ['baz'], instance: moxied }),
        new Call({ args: ['rap'], instance: moxied }),
      ]);
    });

    it('mock the prop value setting by fake implementation at #setter(prop)', () => {
      const mock = new Mock();
      const moxied = mock.proxify({ foo: 'bar' });

      const setFooMock = mock.setter('foo');

      setFooMock.fake(function(val) {
        this._foo = (this._foo || '') + val;
      });

      setFooMock.fakeOnce(function(val) {
        this._foo = (this._foo || '') + val + val;
      });

      moxied.foo = 'foo';
      expect(moxied).toEqual({ foo: 'bar', _foo: 'foofoo' });

      moxied.foo = 'bar';
      moxied.foo = 'baz';
      expect(moxied).toEqual({ foo: 'bar', _foo: 'foofoobarbaz' });

      expect(setFooMock.calls).toEqual([
        new Call({ args: ['foo'], instance: moxied }),
        new Call({ args: ['bar'], instance: moxied }),
        new Call({ args: ['baz'], instance: moxied }),
      ]);

      setFooMock.reset();

      moxied.foo = 'foooo';
      expect(moxied).toEqual({ foo: 'foooo', _foo: 'foofoobarbaz' });

      expect(setFooMock.calls).toEqual([
        new Call({ args: ['foooo'], instance: moxied }),
      ]);
    });
  });

  describe('handler.construct()', () => {
    it('stores constructor calls', () => {
      const mock = new Mock();
      const Moxied = mock.proxify(function Klass() {});

      const moxied1 = new Moxied();
      const moxied2 = new Moxied(0, 1, 2);
      expect(moxied1).toBeInstanceOf(Moxied);
      expect(moxied2).toBeInstanceOf(Moxied);

      expect(Moxied.mock.calls).toEqual([
        new Call({ instance: moxied1, isConstructor: true }),
        new Call({ args: [0, 1, 2], instance: moxied2, isConstructor: true }),
      ]);
    });

    it('can mock an es6 class', () => {
      class Foo {}
      const mock = new Mock();
      const MoxiedFoo = mock.proxify(Foo);

      const foo = new MoxiedFoo();

      expect(foo).toBeInstanceOf(Foo);
      expect(foo).toBeInstanceOf(MoxiedFoo);
      expect(Object.getPrototypeOf(foo)).toBe(Foo.prototype);
      expect(Object.getPrototypeOf(foo)).toBe(MoxiedFoo.prototype);
    });

    it('mock constructor implementation with faking methods', () => {
      function Foo() {
        this.bar = 'bar';
      }

      const mock = new Mock();
      const MoxiedFoo = mock.proxify(Foo);

      expect(new MoxiedFoo()).toEqual({ bar: 'bar' });

      MoxiedFoo.mock.fake(function() {
        this.faked = true;
      });
      expect(new MoxiedFoo()).toEqual({ faked: true });

      expect(MoxiedFoo.mock.calls).toEqual([
        new Call({ isConstructor: true, instance: { bar: 'bar' } }),
        new Call({ isConstructor: true, instance: { faked: true } }),
      ]);
    });

    it('store thrown constructor calls', () => {
      function Foo() {
        throw new Error('bad instance!');
      }

      const mock = new Mock();
      const MoxiedFoo = mock.proxify(Foo);

      expect(() => new MoxiedFoo()).toThrow('bad instance!');
      expect(() => new MoxiedFoo("i'm good")).toThrow('bad instance!');

      MoxiedFoo.mock.fake(function() {
        throw new Error('really bad instance!');
      });
      expect(() => new MoxiedFoo()).toThrow('really bad instance!');
      expect(() => new MoxiedFoo("i'm good")).toThrow('really bad instance!');

      expect(MoxiedFoo.mock.calls).toEqual([
        new Call({
          isConstructor: true,
          instance: undefined,
          isThrow: true,
          result: new Error('bad instance!'),
        }),
        new Call({
          args: ["i'm good"],
          isConstructor: true,
          instance: undefined,
          isThrow: true,
          result: new Error('bad instance!'),
        }),
        new Call({
          isConstructor: true,
          instance: undefined,
          isThrow: true,
          result: new Error('really bad instance!'),
        }),
        new Call({
          args: ["i'm good"],
          isConstructor: true,
          instance: undefined,
          isThrow: true,
          result: new Error('really bad instance!'),
        }),
      ]);
    });

    it('proxify the instance with a new Mock if proxifyNewInstance set to true', () => {
      class Foo {
        // eslint-disable-next-line class-methods-use-this
        bar() {
          return 'baz';
        }
      }

      const mock = new Mock();
      const MoxiedFoo = mock.proxify(Foo);

      const foo1 = new MoxiedFoo();
      expect(foo1).toEqual({});
      expect(foo1.mock).toBeInstanceOf(Mock);
      expect(foo1.mock).not.toBe(mock);
      expect(foo1.mock.options).toEqual(mock.options);

      expect(foo1.bar()).toBe('baz');
      expect(foo1.bar.mock.calls).toEqual([
        new Call({ result: 'baz', instance: foo1 }),
      ]);

      mock.fake(function() {
        this.faked = true;
      });

      const foo2 = new MoxiedFoo();
      expect(foo2).toEqual({ faked: true });
      expect(foo2.mock).toBeInstanceOf(Mock);
      expect(foo2.mock).not.toBe(mock);
      expect(foo2.mock.options).toEqual(mock.options);
    });

    it('keep the original instnce if proxifyNewInstance set to false', () => {
      class Foo {
        // eslint-disable-next-line class-methods-use-this
        bar() {
          return 'baz';
        }
      }
      const mock = new Mock({ proxifyNewInstance: false });
      const MoxiedFoo = mock.proxify(Foo);

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
      const moxied = mock.proxify(x => `hello ${x}`);

      expect(moxied()).toBe('hello undefined');
      expect(moxied('world')).toBe('hello world');
      expect(moxied(1, 2, 3)).toBe('hello 1');

      expect(moxied.mock.calls).toEqual([
        new Call({ result: 'hello undefined' }),
        new Call({ args: ['world'], result: 'hello world' }),
        new Call({ args: [1, 2, 3], result: 'hello 1' }),
      ]);
    });

    it('mock function impletations with faking methods', () => {
      const mock = new Mock();
      const moxied = mock.proxify(x => `hello ${x}`);

      expect(moxied('world')).toBe('hello world');

      // prettier-ignore
      const reverse = str => str.split('').reverse().join('');
      moxied.mock.fake(x => `hello ${reverse(x)}`);

      expect(moxied('world')).toBe('hello dlrow');
      expect(moxied('there')).toBe('hello ereht');

      expect(moxied.mock.calls).toEqual([
        new Call({ args: ['world'], result: 'hello world' }),
        new Call({ args: ['world'], result: 'hello dlrow' }),
        new Call({ args: ['there'], result: 'hello ereht' }),
      ]);
    });

    it('store thrown function calls', () => {
      const mock = new Mock();
      const moxied = mock.proxify(() => {
        throw new Error('bad');
      });

      expect(() => moxied()).toThrow('bad');
      expect(() => moxied('good')).toThrow('bad');

      moxied.mock.fake(() => {
        throw new Error('bad!bad!bad!');
      });

      expect(() => moxied()).toThrow('bad!bad!bad!');
      expect(() => moxied('good')).toThrow('bad!bad!bad!');

      expect(moxied.mock.calls).toEqual([
        new Call({ isThrow: true, result: new Error('bad') }),
        new Call({ args: ['good'], isThrow: true, result: new Error('bad') }),
        new Call({ isThrow: true, result: new Error('bad!bad!bad!') }),
        new Call({
          args: ['good'],
          isThrow: true,
          result: new Error('bad!bad!bad!'),
        }),
      ]);
    });

    it('proxify object returned with a new Mock if proxifyReturnValue set to true', () => {
      const mock = new Mock();
      const moxied = mock.proxify(id => ({ id }));

      const obj1 = moxied(1);
      expect(obj1).toEqual({ id: 1 });
      expect(obj1.mock).toBeInstanceOf(Mock);
      expect(obj1.mock.options).toEqual(mock.options);
      expect(obj1.mock).not.toBe(mock);

      mock.fakeReturnValue({ id: 999 });
      const obj2 = moxied(2);
      expect(obj2).toEqual({ id: 999 });
      expect(obj2.mock).toBeInstanceOf(Mock);
      expect(obj2.mock.options).toEqual(mock.options);
      expect(obj2.mock).not.toBe(mock);
      expect(obj2.mock).not.toBe(obj1.mock);
    });

    it('proxify function returned with a new Mock if proxifyReturnValue set to true', () => {
      const mock = new Mock();
      const moxied = mock.proxify(a => b => a + b);

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

    it('keep original return value if proxifyReturnValue set to false', () => {
      const retrunedObj = {};
      const mock = new Mock({ proxifyReturnValue: false });
      const moxied = mock.proxify(() => retrunedObj);

      expect(moxied()).toBe(retrunedObj);
      expect(moxied().mock).toBe(undefined);

      const returnedFn = () => {};
      mock.fakeReturnValue(returnedFn);

      expect(moxied()).toBe(returnedFn);
      expect(moxied().mock).toBe(undefined);
    });
  });

  describe('other handler method', () => {
    it('work as usual', () => {
      class Foo {}
      const mock = new Mock();
      const moxied = mock.proxify(new Foo());

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

      moxied[fooSym] = 'baz';
      expect(moxied[fooSym]).toBe('bar');

      expect(delete moxied.foo).toBe(true);
      expect('foo' in moxied).toBe(false);

      expect(delete moxied[fooSym]).toBe(false);
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
