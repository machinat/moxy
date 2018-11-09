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
    expect(mock.proxifiedCache).toBeInstanceOf(WeakMap);
    expect(mock.setterMocks).toEqual({});
    expect(mock.getterMocks).toEqual({});
  });
});

describe('#poxify(target, mock)', () => {
  const _Proxy = global.Proxy;

  afterEach(() => {
    global.Proxy = _Proxy;
  });

  it('returns new Proxy(target, mock.handle())', () => {
    const target = () => {};

    const handler = { apply() {} };
    const mockInstance = moxy(new Mock(), {
      proxifyReturnValue: false,
      includeProperties: ['handle'],
    });
    mockInstance.handle.mock.fakeReturnValueOnce(handler);

    global.Proxy = moxy(class {}, {
      proxifyNewInstance: false,
      proxifyProperties: false,
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

  test('invoke faked implementation if #fake(impl)', () => {
    const mock = new Mock();
    const moxied = mock.proxify(() => 0);

    const faked = () => 1;
    mock.fake(faked);

    expect(moxied()).toBe(1);
    expect(moxied()).toBe(1);

    mock.reset();
    expect(moxied()).toBe(0);
  });

  test('invoke fake implementation from #fakeOnce(impl) only once', () => {
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
