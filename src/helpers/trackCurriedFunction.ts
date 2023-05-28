import Mock from '../mock.js';
import { WrapImplFunctor, FunctionImpl } from '../types.js';

const wrapNextFunction = (
  nextValue: unknown,
  mock: Mock,
  fakedFinalValue: undefined | unknown,
  depth: number,
  maxDepth: number
) => {
  if (typeof nextValue !== 'function' || depth >= maxDepth) {
    return fakedFinalValue === undefined ? nextValue : fakedFinalValue;
  }

  let hasBeenCalled = false;

  const wrappedNextFn = (...args: any[]) => {
    const nextNextValue = wrapNextFunction(
      nextValue(...args),
      mock,
      fakedFinalValue,
      depth + 1,
      maxDepth
    );

    const call = mock.getCalls().find(({ result }) => result === wrappedNextFn);
    if (call) {
      if (depth === 0 && !hasBeenCalled) {
        call.args = [call.args];
      }

      call.args[depth + 1] = args;
      call.result = nextNextValue;
    }

    hasBeenCalled = true;
    return nextNextValue;
  };
  return wrappedNextFn;
};

/**
 * Track all the following curried function calls. This transfer `Call.args` into a 2-dimension array
 * that tracks args of each call on the chaining functions. Use it like:
 * ```
 * const curriedFn = moxy(a => b => c => a + b + c);
 * curriedFn.mock.wrap(trackCurriedFunction());
 *
 * curriedFn(1)(2)(3);
 * curriedFn(4)(5)(6);
 *
 * expect(curriedFn).toHaveBeenNthCalledWith(1, [1], [2], [3]);
 * expect(curriedFn).toHaveBeenNthCalledWith(2, [4], [5], [6]);
 * ```
 */
const trackCurriedFunction = (
  /** Optionally fake the final returning value */
  returnValue?: unknown,
  /**
   * Depth of curried function calls to track. If ommited, track till returning
   * value is not a function. It's useful when `returnValue` is a function
   */
  length = Infinity
): WrapImplFunctor => {
  return (fn, mock) =>
    function mockCurriedFunction(this: FunctionImpl, ...args: any[]) {
      const nextValue = Reflect.apply(fn, this, args);
      return wrapNextFunction(nextValue, mock, returnValue, 0, length - 1);
    };
};

export default trackCurriedFunction;
