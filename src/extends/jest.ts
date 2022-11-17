import moxy from '..';
import Mock from '../mock';
import { ProxyMiddleware } from '../types';

Object.defineProperties(Mock.prototype, {
  calls: {
    get() {
      const mock = this as Mock;
      return mock.getCalls().map(({ args }) => args);
    },
  },
  results: {
    get() {
      const mock = this as Mock;
      return mock.getCalls().map(({ isThrow, result }) => ({
        type: isThrow ? 'throw' : 'return',
        value: result,
      }));
    },
  },
  instances: {
    get() {
      const mock = this as Mock;
      return mock.getCalls().map(({ instance }) => instance);
    },
  },
  mock: {
    get() {
      return this;
    },
  },
});

const attachJestFnProperties: ProxyMiddleware = (handler, source) => ({
  ...handler,
  get(target, propKey, receiver) {
    if (propKey === '_isMockFunction') {
      return true;
    }
    if (propKey === 'getMockName') {
      const { name } = source as Function;
      return () => (name ? `moxy(${name})` : 'moxy');
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return handler.get!(target, propKey, receiver);
  },
});

moxy.setDefaultOptions({
  middlewares: [attachJestFnProperties],
});
