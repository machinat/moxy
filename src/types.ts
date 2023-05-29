import type Mock from './mock.js';
import { IS_MOXY } from './constant.js';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Proxifiable = object | Function;

export type FunctionImpl = (...args: any[]) => unknown;
export type ConstructorImpl = { new (...args: any[]): unknown };

export type WrapImplFunctor = (
  original: FunctionImpl,
  mock: Mock
) => FunctionImpl;

export type Moxy<T> = T & { mock: Mock } & {
  [K in keyof T]: T[K] extends FunctionImpl
    ? T[K] & { mock: Mock }
    : T[K] extends ConstructorImpl
    ? T[K] & { mock: Mock }
    : T[K];
};

export interface PropMockMapping {
  [k: string | number | symbol]: Mock;
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

export interface IsMoxyWildcard {
  [IS_MOXY]?: true;
}

export interface MockAccossorWildcard {
  [accessKey: string | symbol]: Mock;
}
