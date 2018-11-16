import deepEqual from 'fast-deep-equal';
import Mock from './mock';

export const equal = (...expectedArgs) => (...actualArgs) =>
  deepEqual(expectedArgs, actualArgs);

export const beginWith = (...expectedArgs) => (...actualArgs) =>
  deepEqual(expectedArgs, actualArgs.slice(0, expectedArgs.length));

export const endWith = (...expectedArgs) => (...actualArgs) =>
  deepEqual(expectedArgs, actualArgs.slice(-expectedArgs.length));

export const nthIs = (idx, expected) => (...actualArgs) =>
  deepEqual(expected, actualArgs[idx]);

export const mockCurryFunction = (mock: Mock) => (fn: Function) =>
  function mockIntermediate(...args) {
    const result = Reflect.apply(fn, this, args);
    return typeof result === 'function' ? mock.proxify(result) : result;
  };

export const mockNewInstance = (mock: Mock) => (fn: Function) =>
  function mockInstance(...args) {
    const instance = Reflect.construct(fn, args, new.target);

    return mock.proxify(instance);
  };
