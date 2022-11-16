import moxyFactory from './factory';
import { MockOptionsInput } from './types';

export { default as factory } from './factory';
export { default as Mock, isMoxy } from './mock';
export { default as Call } from './call';
export { Moxy } from './types';

const defaultOptions = {};

const setDefaultOptions = (options: MockOptionsInput) => {
  Object.assign(defaultOptions, options);
};

const moxy = moxyFactory(defaultOptions);

type GlobalMoxy = typeof moxy & {
  readonly defaultOptions: MockOptionsInput;
  readonly setDefaultOptions: (options: MockOptionsInput) => void;
};

const globalMoxy = Object.defineProperties(moxy as GlobalMoxy, {
  defaultOptions: { value: defaultOptions },
  setDefaultOptions: { value: setDefaultOptions },
});

export default globalMoxy;
