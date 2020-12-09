import deepEqual from 'fast-deep-equal';
import Mock from './mock';
import { FunctionImpl } from './type';

export const equal = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs);

export const beginWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(0, expectedArgs.length));

export const endWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(-expectedArgs.length));

export const nthIs = (idx: number, expected: any) => (...actualArgs: any[]) =>
  deepEqual(expected, actualArgs[idx]);

export const mockCurryFunction = (mock: Mock) => (fn: FunctionImpl) =>
  function mockIntermediate(this: FunctionImpl, ...args: any[]) {
    const result = Reflect.apply(fn, this, args);
    return typeof result === 'function' ? mock.proxify(result) : result;
  };

export const mockNewInstance = (mock: Mock) => (fn: FunctionImpl) =>
  function mockInstance(...args: any[]) {
    const instance = Reflect.construct(fn, args, new.target);

    return mock.proxify(instance);
  };
