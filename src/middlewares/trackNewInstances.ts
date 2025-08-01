import Mock from '../mock.js';
import { ProxyMiddleware } from '../types.js';

/**
 * Track all the constructed instance with the specified mock.
 * Use it like `MyClass.mock.wrap(trackNewInstances(anotherMock))`
 */
const trackNewInstances =
  (mock?: Mock): ProxyMiddleware =>
  (handlers, fn, classMock) => {
    return {
      ...handlers,
      construct: (target, args, newTarget) => {
        const instance = Reflect.construct(target as Function, args, newTarget);
        const trackingMock = mock ?? classMock;

        return trackingMock.proxify(instance);
      },
    };
  };

export default trackNewInstances;
