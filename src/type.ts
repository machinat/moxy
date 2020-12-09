import Mock from './mock';

export type Proxifiable = object | Function;

export type FunctionImpl = (...args: any[]) => unknown;

export type WrapImplFunctor = (original: FunctionImpl) => FunctionImpl;

export type Moxy<T> = T & { mock: Mock } & {
    [K in keyof T]: T[K] extends FunctionImpl ? T[K] & { mock: Mock } : unknown
  };

// eslint-disable-next-line typescript/no-use-before-define
export interface PropMockMapping {
  [k: string /* | number | symbol */]: Mock;
  // FIXME: wait for Microsoft/TypeScript#26797 to support 👆
}

export type ProxyMiddleware = (
  handler: ProxyHandler<Proxifiable>,
  source: Proxifiable,
  mock: Mock
) => ProxyHandler<Proxifiable>;

export interface MockOptions {
  accessKey: string | symbol;
  middlewares: null | ProxyMiddleware[];
  mockReturn: boolean;
  mockNewInstance: boolean;
  mockMethod: boolean;
  includeProperties: null | (string | symbol)[];
  excludeProperties: null | (string | symbol)[];
  recordGetter: boolean;
  recordSetter: boolean;
}

export type MockOptionsInput = { [O in keyof MockOptions]?: MockOptions[O] };

export type ProxifiedCache = Map<Proxifiable, Proxifiable>;
