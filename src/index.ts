import moxyFactory from './factory';
import { MockOptionsInput } from './types';

export { default as factory } from './factory';
export { default as Mock } from './mock';
export { default as Call } from './call';
export * from './helpers';
export { Moxy } from './types';

const defaultOptions = {};

const setDefaultOptions = (options: MockOptionsInput) => {
  Object.assign(defaultOptions, options);
};

/**
 * The global mocking function with default settings.
 * Simply mock everything with `moxy(objectOrFunction)`.
 * When target is omitted like `moxy()`, it's equivalant to `moxy(function(){})`
 */
const moxy = moxyFactory(defaultOptions);

type GlobalMoxy = typeof moxy & {
  /** The default mock options */
  readonly defaultOptions: MockOptionsInput;
  /** Overwrite the default mock options */
  readonly setDefaultOptions: (options: MockOptionsInput) => void;
};

const globalMoxy = Object.defineProperties(moxy as GlobalMoxy, {
  defaultOptions: { value: defaultOptions },
  setDefaultOptions: { value: setDefaultOptions },
});

export default globalMoxy;
