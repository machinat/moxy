import moxyFactory from './factory';
import { MoxyFunc, MockOptionsInput } from './type';

type MoxyModule = MoxyFunc & {
  defaultOptions: MockOptionsInput;
  setDefaultOptions: (options: MockOptionsInput) => void;
};

const defaultOptions = {};

const moxy = moxyFactory(defaultOptions) as MoxyModule;

moxy.defaultOptions = defaultOptions;
moxy.setDefaultOptions = options => {
  Object.assign(defaultOptions, options);
};

export default moxy;
export { default as factory } from './factory';
export { default as Mock, isMoxy } from './mock';
export { default as Call } from './call';
