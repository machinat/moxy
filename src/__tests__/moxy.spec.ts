import moxy from '../moxy';

it('is a function', () => {
  expect(typeof moxy).toBe('function');
});

it('throw if primitive type passed as target', () => {
  const illegalTargets = [
    null,
    0,
    1,
    999,
    Infinity,
    NaN,
    true,
    false,
    '',
    'hello world',
    Symbol(''),
  ];

  illegalTargets.forEach(target => {
    expect(() => moxy(<any>target)).toThrow(
      'Cannot create proxy with a non-object as target or handler'
    );
  });
});

describe('empty mock', () => {
  it('return a empty function mock when no target pass', () => {
    const spy = moxy();

    expect(typeof spy).toBe('function');
    expect(typeof spy.prototype).toBe('object');
  });

  test('empty mock as a function', () => {
    const spy = moxy();

    [
      spy(),
      spy('foo'),
      spy('bar', 'baz'),
      spy.call(null, 'hello'),
      spy.apply({}, ['world']),
    ].forEach(r => {
      expect(r).toBe(undefined);
    });

    expect(spy.mock.calls.length).toBe(5);

    // prettier-ignore
    expect(spy.mock.calls).toEqual([
      {args: [],             instance: undefined, value: undefined,  isThrow: false, isConstructor: false},
      {args: ['foo'],        instance: undefined, value: undefined,  isThrow: false, isConstructor: false},
      {args: ['bar', 'baz'], instance: undefined, value: undefined,  isThrow: false, isConstructor: false},
      {args: ['hello'],      instance: null,      value: undefined,  isThrow: false, isConstructor: false},
      {args: ['world'],      instance: {},        value: undefined,  isThrow: false, isConstructor: false},
    ]);
  });
});

test('empty mock as an object', () => {
  const greeting = agent => `Hello, ${agent.introduce()}`;
  function introduce() {
    return `I'm ${this.code}.`;
  }

  const spy = moxy();
  spy.code = 'James Bond';
  spy.introduce = introduce;

  greeting(spy);

  expect(spy.introduce.mock.calls).toEqual([
    {
      args: [],
      value: "I'm James Bond.",
      instance: spy,
      isThrow: false,
      isConstructor: false,
    },
  ]);

  expect(spy.mock.getter('code').calls).toEqual([
    {
      args: [],
      value: 'James Bond',
      instance: spy,
      isThrow: false,
      isConstructor: false,
    },
  ]);

  expect(spy.mock.setter('code').calls).toEqual([
    {
      args: ['James Bond'],
      value: undefined,
      instance: spy,
      isThrow: false,
      isConstructor: false,
    },
  ]);

  expect(spy.mock.setter('introduce').calls).toEqual([
    {
      args: [introduce],
      value: undefined,
      instance: spy,
      isThrow: false,
      isConstructor: false,
    },
  ]);
});

test('empty mock as a constructor', () => {
  const greeting = (agent, name) => agent.sayHello(name);

  const Spy = moxy();
  Spy.prototype.sayHello = function(name) {
    return `hello ${name}`;
  };

  const spy1 = new Spy(1);
  const spy2 = new Spy(2);

  greeting(spy1, 'John');
  greeting(spy2, 'Anny');

  expect(spy1.sayHello.mock.calls).toEqual([
    {
      args: ['John'],
      value: 'hello John',
      instance: spy1,
      isThrow: false,
      isConstructor: false,
    },
  ]);

  expect(spy2.sayHello.mock.calls).toEqual([
    {
      args: ['Anny'],
      value: 'hello Anny',
      instance: spy2,
      isThrow: false,
      isConstructor: false,
    },
  ]);

  expect(Spy.mock.calls).toEqual([
    {
      args: [1],
      value: undefined,
      instance: spy1,
      isThrow: false,
      isConstructor: true,
    },
    {
      args: [2],
      value: undefined,
      instance: spy2,
      isThrow: false,
      isConstructor: true,
    },
  ]);
});
