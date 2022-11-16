import Mock from '../../mock';
import Call from '../../call';
import trackNewInstancesBy from '../trackNewInstancesBy';

it('work with mock.wrap()', () => {
  const instanceMock = new Mock();

  const classMock = new Mock().wrap(trackNewInstancesBy(instanceMock));
  class Foo { someMethod() { } } // eslint-disable-line
  const MoxiedFoo: any = classMock.proxify(Foo);

  const foo1 = new MoxiedFoo();
  expect(foo1.mock).toBe(instanceMock);

  const foo2 = new MoxiedFoo();
  expect(foo2.mock).toBe(instanceMock);

  foo1.someMethod(1);
  foo2.someMethod(2);

  expect(foo1.someMethod.mock).toBe(foo2.someMethod.mock);
  expect(foo1.someMethod.mock.calls).toEqual([
    new Call({ args: [1], instance: foo1 }),
    new Call({ args: [2], instance: foo2 }),
  ]);
});
