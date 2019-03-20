import Mock from './mock';

export type MoxyFunc = (
  target?: object | Function,
  options?: MockOptionsInput
) => any;

// eslint-disable-next-line typescript/no-use-before-define
export interface PropMockMapping {
  [k: string /* | number | symbol */]: Mock;
}
// FIXME: wait for Microsoft/TypeScript#26797 to support 👆
export type Proxifiable = object | Function;

export type ProxyMiddleware = (
  handler: ProxyHandler<Proxifiable>,
  source: Proxifiable,
  mock: Mock
) => ProxyHandler<Proxifiable>;

export interface MockOptions {
  mockAccessKey: string | symbol;
  middlewares: null | ProxyMiddleware[];
  mockReturnValue: boolean;
  mockNewInstance: boolean;
  mockProperty: boolean;
  includeProps: null | (string | symbol)[];
  excludeProps: null | (string | symbol)[];
  recordGetter: boolean;
  recordSetter: boolean;
}

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };

export type ProxifiedCache = Map<Proxifiable, Proxifiable>;
