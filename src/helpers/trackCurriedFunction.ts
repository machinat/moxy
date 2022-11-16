import { WrapImplFunctor } from '../types';

const trackCurriedFunction = (value?: unknown): WrapImplFunctor => (
  fn,
  mock
) => (...args) => {
  const nextValue = Reflect.apply(fn, this, args);
  return typeof nextValue === 'function'
    ? mock.proxify(nextValue)
    : value === undefined
    ? nextValue
    : value;
};

export default trackCurriedFunction;
