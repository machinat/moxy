import Mock from '../mock';
import { ProxyMiddleware } from '../type';

Object.defineProperties(Mock.prototype, {
  _isMockFunction: {
    value: true,
  },

  getMockName: {
    value: () => 'moxy',
  },

  mock: {
    get() {
      return {
        calls: this.calls.map(({ args }) => args),
        results: this.calls.map(({ isThrow, result }) => ({
          type: isThrow ? 'throw' : 'return',
          value: result,
        })),
        instances: this.calls.map(({ instance }) => instance),
      };
    },
  },
});

const jestFnMockProps = {
  _isMockFunction: true,
  getMockName: true,
  mock: true,
};

const attachJestFnMockProps = (): ProxyMiddleware => (
  handler,
  source,
  mock
) => ({
  ...handler,
  get(target, propKey, receiver) {
    if (jestFnMockProps[propKey]) {
      return mock[propKey];
    }

    return handler.get(target, propKey, receiver);
  },
});

export default attachJestFnMockProps;
