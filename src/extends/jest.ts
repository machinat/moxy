import moxy from '..';
import Mock from '../mock';
import Call from '../call';
import { ProxyMiddleware } from '../types';

Object.defineProperties(Mock.prototype, {
  calls: {
    get() {
      const mock = this as Mock;
      return mock.getCalls().map(call => {
        const compatibleCall = [...call.args] as any[] & Call;

        Object.defineProperties(compatibleCall, {
          args: {
            value: call.args,
          },
          result: {
            value: call.result,
          },
          instance: {
            value: call.instance,
          },
          isThrown: {
            value: call.isThrown,
          },
          isConstructor: {
            value: call.isConstructor,
          },
        });

        return compatibleCall;
      });
    },
  },
  results: {
    get() {
      const mock = this as Mock;
      return mock.getCalls().map(({ isThrown, result }) => ({
        type: isThrown ? 'throw' : 'return',
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
  _isMockFunction: {
    get() {
      return true;
    },
  },
  getMockName: {
    get() {
      return () => 'moxy';
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
