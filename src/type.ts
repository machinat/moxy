import Mock from './mock';

export type MoxyFunc = (
  target?: object | Function,
  options?: MockOptionsInput
) => any;

// eslint-disable-next-line typescript/no-use-before-define
export type PropMockMapping = { [k: string /* | number | symbol */]: Mock };
// FIXME: wait Microsoft/TypeScript#26797 to support 👆
export type Proxifiable = object | Function;

export type ProxyMiddleware = (
  handler: ProxyHandler<Proxifiable>,
  source: Proxifiable,
  mock: Mock
) => ProxyHandler<Proxifiable>;

export type MockOptions = {
  accessKey: string | symbol;
  middlewares?: Array<ProxyMiddleware>;
  proxifyReturnValue: boolean;
  proxifyNewInstance: boolean;
  proxifyProperties: boolean;
  includeProperties?: Array<string | symbol>;
  excludeProperties?: Array<string | symbol>;
};

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };
