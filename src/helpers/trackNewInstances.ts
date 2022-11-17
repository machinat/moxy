import Mock from '../mock';
import { WrapImplFunctor } from '../types';

/**
 * Track all the constructed instance with the specified mock.
 * Use it like `MyClass.mock.wrap(trackNewInstances(anotherMock))`
 */
const trackNewInstances = (mock?: Mock): WrapImplFunctor => (fn, classMock) =>
  function mockInstance(...args: any[]) {
    const trackingMock = mock || classMock;
    const instance = Reflect.construct(fn, args, new.target);

    return trackingMock.proxify(instance);
  };

export default trackNewInstances;
