import { WrapImplFunctor, FunctionImpl } from '../types';

/**
 * Track all the descending curried function calls with root mock instance.
 * Use it like `curriedFn.mock.wrap(trackCurriedFunction())`
 */
const trackCurriedFunction = (
  /** Optionally fake the final returning value */
  returnValue?: unknown,
  /**
   * Depth of curried function calls to track. If ommited, track till returning
   * value is not a function. It's useful when `returnValue` is a function
   */
  depth: number = Infinity
): WrapImplFunctor => {
  let depthCountDown = depth;

  return (fn, mock) =>
    function mockCurriedFunction(this: FunctionImpl, ...args: any[]) {
      const nextValue = Reflect.apply(fn, this, args);
      depthCountDown -= 1;

      return typeof nextValue === 'function' && depthCountDown > 0
        ? mock.proxify(nextValue)
        : returnValue === undefined
        ? nextValue
        : returnValue;
    };
};

export default trackCurriedFunction;
