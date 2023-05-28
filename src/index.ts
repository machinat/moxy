import moxyFactory from './factory.js';
import { MockOptionsInput } from './types.js';

export { default as factory } from './factory.js';
export { default as Mock } from './mock.js';
export { default as Call } from './call.js';
export * from './helpers/index.js';
export { Moxy } from './types.js';

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
