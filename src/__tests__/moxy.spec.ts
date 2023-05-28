import moxy from '../index.js';
import Call from '../call.js';

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

  illegalTargets.forEach((target: any) => {
    expect(() => moxy(target)).toThrow(
      new TypeError(
        `Cannot create a proxy with ${
          typeof target === 'string' ? JSON.stringify(target) : String(target)
        }`
      )
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
    ].forEach((r) => {
      expect(r).toBe(undefined);
    });

    expect(spy.mock.getCalls().length).toBe(5);

    expect(spy.mock.getCalls()).toEqual([
      new Call(),
      new Call({ args: ['foo'] }),
      new Call({ args: ['bar', 'baz'] }),
      new Call({ args: ['hello'], instance: null }),
      new Call({ args: ['world'], instance: {} }),
    ]);

    spy.mock.clear();
    spy.mock.fake((...args: string[]) => args.join(' and '));

    expect(spy('foo', 'bar', 'baz')).toBe('foo and bar and baz');
    expect(spy.mock.getCalls()).toEqual([
      new Call({ args: ['foo', 'bar', 'baz'], result: 'foo and bar and baz' }),
    ]);
  });
});

test('empty mock as an object', () => {
  const greeting = (agent: { introduce(): string }) =>
    `Hello, ${agent.introduce()}`;

  function introduce(this: { code: string }) {
    return `I'm ${this.code}.`;
  }

  const spy = moxy({} as any, { recordGetter: true });
  spy.code = 'James Bond';
  spy.introduce = introduce;

  greeting(spy);

  spy.mock.getter('code').fakeReturnValueOnce('007');
  greeting(spy);

  expect(spy.introduce.mock.getCalls()).toEqual([
    new Call({ result: "I'm James Bond.", instance: spy }),
    new Call({ result: "I'm 007.", instance: spy }),
  ]);

  expect(spy.mock.getter('code').getCalls()).toEqual([
    new Call({ result: 'James Bond', instance: spy }),
    new Call({ result: '007', instance: spy }),
  ]);

  expect(spy.mock.setter('code').getCalls()).toEqual([
    new Call({ args: ['James Bond'], instance: spy }),
  ]);

  expect(spy.mock.setter('introduce').getCalls()).toEqual([
    new Call({ args: [introduce], instance: spy }),
  ]);
});

test('empty mock as a constructor', () => {
  const greeting = (agent: { sayHello(s: string): string }, name: string) =>
    agent.sayHello(name);

  const Spy = moxy();
  Spy.prototype.sayHello = (name: string) => `Hello, ${name}.`;

  const spy1 = new Spy(1);
  const spy2 = new Spy(2);

  greeting(spy1, 'John');
  greeting(spy2, 'Anny');

  spy2.sayHello.mock.fake((name: string) => `Greeting, ${name}.`);
  greeting(spy2, 'Anny');

  const expectedCalls = [
    new Call({ args: ['John'], result: 'Hello, John.', instance: spy1 }),
    new Call({ args: ['Anny'], result: 'Hello, Anny.', instance: spy2 }),
    new Call({ args: ['Anny'], result: 'Greeting, Anny.', instance: spy2 }),
  ];

  expect(spy1.sayHello.mock.getCalls()).toEqual(expectedCalls.slice(0, 1));

  expect(spy2.sayHello.mock.getCalls()).toEqual(expectedCalls.slice(1, 3));

  expect(Spy.mock.getCalls()).toEqual([
    new Call({ args: [1], instance: spy1, isConstructor: true }),
    new Call({ args: [2], instance: spy2, isConstructor: true }),
  ]);
});
