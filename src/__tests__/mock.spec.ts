import moxy from '..';
import Call from '../call';
import Mock from '../mock';

declare let global: { Proxy: any };

it('is a constructor', () => {
  expect(typeof Mock).toBe('function');
  expect(() => new Mock()).not.toThrow();
});

describe('#poxify(target, mock)', () => {
  const _Proxy = global.Proxy;

  afterEach(() => {
    global.Proxy = _Proxy;
  });

  xit('returns new Proxy(target, mock.handle())', () => {
    const target = () => {};

    const handler = { apply() {} };
    const mockInstance = moxy(new Mock(), {
      proxifyReturnValue: false,
      proxifyProperty: false,
    });
    mockInstance.handle.mock.fakeReturnValueOnce(handler);

    global.Proxy = moxy(class {}, {
      proxifyNewInstance: false,
      proxifyProperty: false,
    });

    const proxied = mockInstance.proxify(target);

    expect(mockInstance.handle.mock.calls).toEqual([
      new Call({ instance: mockInstance, result: handler }),
    ]);

    expect(global.Proxy.mock.calls).toEqual([
      new Call({
        args: [target, handler],
        instance: proxied,
        isConstructor: true,
      }),
    ]);
  });
});

describe('#constructor(options)', () => {
  it('configures options with default value', () => {
    expect(new Mock().options).toEqual({
      accessKey: 'mock',
      middlewares: [],
      proxifyReturnValue: true,
      proxifyNewInstance: true,
      proxifyProperty: true,
    });

    const fullOptions = {
      accessKey: 'MOCK',
      middlewares: [handler => handler],
      proxifyReturnValue: false,
      proxifyNewInstance: false,
      proxifyProperty: false,
    };
    expect(new Mock(fullOptions).options).toEqual(fullOptions);

    expect(
      new Mock({ accessKey: 'moooock', proxifyReturnValue: false }).options
    ).toEqual({
      accessKey: 'moooock',
      middlewares: [],
      proxifyReturnValue: false,
      proxifyNewInstance: true,
      proxifyProperty: true,
    });
  });

  it('initiate basic props', () => {
    const mock = new Mock();

    expect(mock.calls).toEqual([]);
    expect(mock.impletationQueue).toEqual([]);
    expect(mock.proxifiedCache).toBeInstanceOf(WeakMap);
    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});
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
  #getImplementation(target)
  #fake(impl)
  #fakeOnce(impl)
  #fakeReturnValue(val)
  #fakeReturnValueOnce(val)
`, () => {
  test('#getImplementation() returns undefined if not faked and no target', () => {
    const mock = new Mock();
    expect(mock.getImplementation()).toBe(undefined);
  });

  test('#getImplementation() returns target if not faked', () => {
    const mock = new Mock();
    const target = () => {};

    expect(mock.getImplementation(target)).toBe(target);
  });

  test('#getImplementation() retruns impl of #fake(impl)', () => {
    const mock = new Mock();
    const origin = () => {};
    const faking = () => {};

    mock.fake(faking);
    expect(mock.getImplementation(origin)).toBe(faking);
    expect(mock.getImplementation(origin)).toBe(faking);

    mock.reset();
    expect(mock.getImplementation(origin)).toBe(origin);
  });

  test('#getImplementation() retruns impl of #fakeOnce(impl) only once', () => {
    const mock = new Mock();
    const origin = () => {};
    const faking = () => {};
    const faking1 = () => {};
    const faking2 = () => {};

    mock.fakeOnce(faking);
    expect(mock.getImplementation(origin)).toBe(faking);
    expect(mock.getImplementation(origin)).toBe(origin);

    mock.fake(faking);
    mock.fakeOnce(faking1);
    mock.fakeOnce(faking2);
    expect(mock.getImplementation(origin)).toBe(faking1);
    expect(mock.getImplementation(origin)).toBe(faking2);
    expect(mock.getImplementation(origin)).toBe(faking);

    mock.reset();
    expect(mock.getImplementation(origin)).toBe(origin);
  });

  test('#fakeReturnValue(val) is equivelant to #fake(() => val)', () => {
    const mock = moxy(new Mock());

    const faked = {};
    mock.fakeReturnValue(faked);

    expect(mock.fake.mock.calls.length).toBe(1);
    expect(mock.fake.mock.calls[0].args.length).toBe(1);

    const fakedFn = mock.fake.mock.calls[0].args[0];
    expect(typeof fakedFn).toBe('function');
    expect(fakedFn()).toBe(faked);
  });

  test('#fakeReturnValueOnce(val) is equivelant to #fakeOnce(() => val)', () => {
    const mock = moxy(new Mock());

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
  it('is lazily created when get invoked and stored in .setterMocks', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const setFooMock = mock.setter('foo');
    expect(setFooMock).toBeInstanceOf(Mock);
    expect(mock.setterMocks.foo).toBe(setFooMock);
  });

  it('returns mock corresponded to set prop value', () => {
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

  it('can fake the value set from original mock', () => {
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

describe(`#getter(prop)`, () => {
  it('is lazily created when get invoked and stored in .getterMocks', () => {
    const mock = new Mock();
    mock.proxify({ foo: 'bar' });

    expect(mock.getterMocks).toEqual({});

    const getFooMock = mock.getter('foo');
    expect(getFooMock).toBeInstanceOf(Mock);
    expect(mock.getterMocks.foo).toBe(getFooMock);
  });

  it('returns mock corresponded to get prop value', () => {
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

  it('can fake the value get from original mock', () => {
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
});

describe('#clear() #reset()', () => {});
