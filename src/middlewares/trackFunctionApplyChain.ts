import Mock from '../mock.js';
import { ProxyMiddleware } from '../types.js';

const wrapNextFunction = (
  nextValue: unknown,
  mock: Mock,
  depth: number,
  maxDepth: number
) => {
  if (typeof nextValue !== 'function' || depth >= maxDepth) {
    return nextValue;
  }

  const wrappedNextFn = (...args: any[]) => {
    const nextNextValue = nextValue(...args);
    const call = mock.getCalls().find(({ result }) => result === nextValue);
    if (!call) {
      throw new Error(
        'trackFunctionApplyChain: No call found for the next function. Ensure the function has been called before wrapping.'
      );
    }
    call.args[depth] = args;
    call.result = nextNextValue;

    return wrapNextFunction(nextNextValue, mock, depth + 1, maxDepth);
  };
  return wrappedNextFn;
};

/**
 * Track all the following curried function calls. This transfer `Call.args` into a 2-dimension array
 * that tracks args of each call on the chaining functions. Use it like:
 * ```
 * const curriedFn = moxy(
 *   a => b => c => a + b + c,
 *   { middlewares: [trackFunctionApplyChain()] }
 * );
 *
 * curriedFn(1)(2)(3);
 * curriedFn(4)(5)(6);
 *
 * expect(curriedFn).toHaveBeenNthCalledWith(1, [1], [2], [3]);
 * expect(curriedFn).toHaveBeenNthCalledWith(2, [4], [5], [6]);
 * ```
 */
const trackFunctionApplyChain = (
  /**
   * Depth of curried function calls to track. If ommited, track till returning
   * value is not a function. It's useful when `returnValue` is a function
   */
  trackDepth = Infinity
): ProxyMiddleware => {
  return (handlers, fn, mock) => {
    return {
      ...handlers,
      apply: (target, thisArg, args) => {
        const nextValue = handlers.apply?.(target, thisArg, args);
        const wrappedNextFn = wrapNextFunction(nextValue, mock, 1, trackDepth);

        const calls = mock.getCalls();
        const initialCall = calls[calls.length - 1];
        if (!initialCall) {
          throw new Error(
            'trackFunctionApplyChain: No initial call found. Ensure the function has been called before wrapping.'
          );
        }

        initialCall.args = [initialCall.args];
        return wrappedNextFn;
      },
    };
  };
};

export default trackFunctionApplyChain;
