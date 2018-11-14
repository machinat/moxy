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

    spy.mock.clear();
    spy.mock.fake((...args) => args.join(' and '));

    expect(spy('foo', 'bar', 'baz')).toBe('foo and bar and baz');
    expect(spy.mock.calls).toEqual([
      new Call({ args: ['foo', 'bar', 'baz'], result: 'foo and bar and baz' }),
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

  spy.mock.getter('code').fakeReturnValueOnce('007');
  greeting(spy);

  expect(spy.introduce.mock.calls).toEqual([
    new Call({ result: "I'm James Bond.", instance: spy }),
    new Call({ result: "I'm 007.", instance: spy }),
  ]);

  expect(spy.mock.getter('code').calls).toEqual([
    new Call({ result: 'James Bond', instance: spy }),
    new Call({ result: '007', instance: spy }),
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
  Spy.prototype.sayHello = name => `Hello, ${name}.`;

  const spy1 = new Spy(1);
  const spy2 = new Spy(2);

  greeting(spy1, 'John');
  greeting(spy2, 'Anny');

  spy2.sayHello.mock.fake(name => `Greeting, ${name}.`);
  greeting(spy2, 'Anny');

  const expectedCalls = [
    new Call({ args: ['John'], result: 'Hello, John.', instance: spy1 }),
    new Call({ args: ['Anny'], result: 'Hello, Anny.', instance: spy2 }),
    new Call({ args: ['Anny'], result: 'Greeting, Anny.', instance: spy2 }),
  ];

  expect(spy1.sayHello.mock.calls).toEqual(expectedCalls.slice(0, 1));

  expect(spy2.sayHello.mock.calls).toEqual(expectedCalls.slice(1, 3));

  expect(Spy.mock.calls).toEqual([
    new Call({ args: [1], instance: spy1, isConstructor: true }),
    new Call({ args: [2], instance: spy2, isConstructor: true }),
  ]);
});
