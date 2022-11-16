import { WrapImplFunctor } from '../types';

/**
 * Track all the descending curried function calls with root mock instance.
 * Use it like `curriedFn.mock.wrap(trackCurriedFunction())`
 */
const trackCurriedFunction = (
  /** Swap the final returning value with the faked value */
  value?: unknown
): WrapImplFunctor => (fn, mock) => (...args) => {
  const nextValue = Reflect.apply(fn, this, args);
  return typeof nextValue === 'function'
    ? mock.proxify(nextValue)
    : value === undefined
    ? nextValue
    : value;
};

export default trackCurriedFunction;
