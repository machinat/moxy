import { WrapImplFunctor } from '../types';

const trackCurriedFunction = (value?: unknown): WrapImplFunctor => (
  originalFn,
  mock
) => (...args) => {
  const nextValue = originalFn(...args);
  return typeof nextValue === 'function'
    ? mock.proxify(nextValue)
    : value === undefined
    ? nextValue
    : value;
};

export default trackCurriedFunction;
