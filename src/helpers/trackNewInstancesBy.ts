import Mock from '../mock';
import { FunctionImpl, WrapImplFunctor } from '../types';

/**
 * Track all the constructed instance with the specified mock.
 * Use it like `MyClass.mock.wrap(trackNewInstancesBy(anotherMock))`
 */
const trackNewInstancesBy = (mock: Mock): WrapImplFunctor => (
  fn: FunctionImpl
) =>
  function mockInstance(...args: any[]) {
    const instance = Reflect.construct(fn, args, new.target);

    return mock.proxify(instance);
  };

export default trackNewInstancesBy;
