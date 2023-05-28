import moxy, { Moxy } from '../../index.js';
import Mock from '../../mock.js';
import Call from '../../call.js';
import trackNewInstances from '../trackNewInstances.js';

it('work with mock.wrap()', () => {
  const instanceMock = new Mock();

  class Foo { someMethod(_: number) { } } // eslint-disable-line
  const MoxiedFoo = moxy(Foo);
  MoxiedFoo.mock.wrap(trackNewInstances(instanceMock));

  const foo1 = new MoxiedFoo() as Moxy<Foo>;
  expect(foo1.mock).toBe(instanceMock);

  const foo2 = new MoxiedFoo() as Moxy<Foo>;
  expect(foo2.mock).toBe(instanceMock);

  foo1.someMethod(1);
  foo2.someMethod(2);

  expect(foo1.someMethod.mock).toBe(foo2.someMethod.mock);
  expect(foo1.someMethod.mock.getCalls()).toEqual([
    new Call({ args: [1], instance: foo1 }),
    new Call({ args: [2], instance: foo2 }),
  ]);
});

it('track with class mock if mock param omitted', () => {
  class Foo { someMethod(_: number) { } } // eslint-disable-line
  const MoxiedFoo = moxy(Foo);
  MoxiedFoo.mock.wrap(trackNewInstances());

  const foo1 = new MoxiedFoo() as Moxy<Foo>;
  expect(foo1.mock).toBe(MoxiedFoo.mock);

  const foo2 = new MoxiedFoo() as Moxy<Foo>;
  expect(foo2.mock).toBe(MoxiedFoo.mock);

  foo1.someMethod(1);
  foo2.someMethod(2);

  expect(foo1.someMethod.mock).toBe(foo2.someMethod.mock);
  expect(foo1.someMethod.mock.getCalls()).toEqual([
    new Call({ args: [1], instance: foo1 }),
    new Call({ args: [2], instance: foo2 }),
  ]);
});
