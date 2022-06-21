import Mock from '../mock';
import { ProxyMiddleware } from '../types';

const JestFnDescriptor = {
  _isMockFunction: {
    value: true,
  },

  getMockName: {
    value: () => 'moxy',
  },

  mock: {
    get() {
      const { calls } = (this as unknown) as Mock;

      return {
        calls: calls.map(({ args }) => args),
        results: calls.map(({ isThrow, result }) => ({
          type: isThrow ? 'throw' : 'return',
          value: result,
        })),
        instances: calls.map(({ instance }) => instance),
      };
    },
  },
};

Object.defineProperties(Mock.prototype, JestFnDescriptor);

export const attachJestFnProperties = (): ProxyMiddleware => (
  handler,
  source,
  mock
) => ({
  ...handler,
  get(target, propKey, receiver) {
    if (propKey in JestFnDescriptor) {
      // @ts-ignore it was mixed in
      return mock[propKey];
    }
    // @ts-ignore handler.get() should exist
    return handler.get(target, propKey, receiver);
  },
});
