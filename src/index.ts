import moxyFactory from './factory';
import { MoxyFunc, MockOptionsInput } from './type';

type MoxyModule = MoxyFunc & {
  defaultOptions: MockOptionsInput;
  setDefaultOptions: (MockOptionsInput) => void;
};

const defaultOptions = {
  // The default options are:
  // accessKey: 'mock',
  // middlewares: null,
  // proxifyReturnValue: true,
  // proxifyNewInstance: true,
  // proxifyProperties: true,
  // includeProperties: null,
  // excludeProperties: null,
};

const moxy = <MoxyModule>moxyFactory(defaultOptions);

moxy.defaultOptions = defaultOptions;
moxy.setDefaultOptions = options => {
  Object.assign(defaultOptions, options);
};

export default moxy;
export { default as moxyFactory } from './factory';
export { default as Mock, isMoxy } from './mock';
export { default as Call } from './call';
