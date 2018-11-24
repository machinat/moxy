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
  mockReturnValue: boolean;
  mockNewInstance: boolean;
  mockProperty: boolean;
  includeProps?: Array<string | symbol>;
  excludeProps?: Array<string | symbol>;
  recordGetter: boolean;
  recordSetter: boolean;
};

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };
