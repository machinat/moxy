import moxy from '../moxy';
import Call from '../call';

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

    expect(spy.mock.calls).toEqual([
      new Call(),
      new Call({ args: ['foo'] }),
      new Call({ args: ['bar', 'baz'] }),
      new Call({ args: ['hello'], instance: null }),
      new Call({ args: ['world'], instance: {} }),
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
    new Call({ result: "I'm James Bond.", instance: spy }),
  ]);

  expect(spy.mock.getter('code').calls).toEqual([
    new Call({ result: 'James Bond', instance: spy }),
  ]);

  expect(spy.mock.setter('code').calls).toEqual([
    new Call({ args: ['James Bond'], instance: spy }),
  ]);

  expect(spy.mock.setter('introduce').calls).toEqual([
    new Call({ args: [introduce], instance: spy }),
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
    new Call({
      args: ['John'],
      result: 'hello John',
      instance: spy1,
    }),
  ]);

  expect(spy2.sayHello.mock.calls).toEqual([
    new Call({
      args: ['Anny'],
      result: 'hello Anny',
      instance: spy2,
    }),
  ]);

  expect(Spy.mock.calls).toEqual([
    new Call({ args: [1], instance: spy1, isConstructor: true }),
    new Call({ args: [2], instance: spy2, isConstructor: true }),
  ]);
});
