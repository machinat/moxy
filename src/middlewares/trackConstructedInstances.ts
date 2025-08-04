import Mock from '../mock.js';
import { ProxyMiddleware } from '../types.js';

/**
 * Track all the constructed instance with the specified mock.
 * Use it like `MyClass.mock.wrap(trackConstructedInstances(anotherMock))`
 */
const trackConstructedInstances =
  (mock?: Mock): ProxyMiddleware =>
  (handlers, fn, classMock) => {
    return {
      ...handlers,
      construct: (target, args, newTarget) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const instance = Reflect.construct(target as Function, args, newTarget);
        const trackingMock = mock ?? classMock;

        return trackingMock.proxify(instance);
      },
    };
  };

export default trackConstructedInstances;
