import moxyFactory from './factory';
import _Mock from './mock';
import _Call from './call';
import { MockOptionsInput, Moxy as _Moxy } from './types';
import * as helpers from './helpers';

namespace GlobalMoxy {
  export const defaultOptions = {};

  export const setDefaultOptions = (options: MockOptionsInput) => {
    Object.assign(defaultOptions, options);
  };

  /**
   * The global mocking function with default settings.
   * Simply mock everything with `moxy(objectOrFunction)`.
   * When target is omitted like `moxy()`, it's equivalant to `moxy(function(){})`
   */
  export const moxy = moxyFactory(defaultOptions);

  export const factory = moxyFactory;

  export const Mock = _Mock;
  export type Mock = _Mock;
  export const Call = _Call;
  export type Call = _Call;

  export type Moxy<T> = _Moxy<T>;
  export const {
    isMoxy,
    trackCurriedFunction,
    trackNewInstances,
    equal,
    beginWith,
    endWith,
    nthIs,
  } = helpers;
}

export = GlobalMoxy;
