import moxyFactory from './factory';
import { MockOptionsInput } from './type';

export { default as factory } from './factory';
export { default as Mock, isMoxy } from './mock';
export { default as Call } from './call';

const defaultOptions = {};

const setDefaultOptions = (options: MockOptionsInput) => {
  Object.assign(defaultOptions, options);
};

const moxy = moxyFactory(defaultOptions);

type GlobalMoxy = typeof moxy & {
  readonly defaultOptions: MockOptionsInput;
  readonly setDefaultOptions: (options: MockOptionsInput) => void;
};

const globalMoxy: GlobalMoxy = Object.defineProperties(moxy, {
  defaultOptions: { value: defaultOptions },
  setDefaultOptions: { value: setDefaultOptions },
});

export default globalMoxy;
