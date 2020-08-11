import { PropMockMapping, Proxifiable, MockOptionsInput } from './type';

export const createProxyTargetDouble = (source: Proxifiable): Proxifiable =>
  typeof source === 'function' ? function moxyDouble() {} : Object.create(null);

export const clearPropMockMapping = (mapping: PropMockMapping): void => {
  Reflect.ownKeys(mapping).forEach(k => {
    // @ts-ignore wait for symbol index supported
    mapping[k].clear();
  });
};

export const isProxifiable = (target: any): target is Proxifiable =>
  (typeof target === 'object' &&
    target !== null &&
    !(target instanceof Promise)) ||
  typeof target === 'function';

export const isFunctionProp = (
  source: Proxifiable,
  propName: number | string | symbol
): boolean =>
  typeof source === 'function' &&
  (propName === 'prototype' || propName === 'name' || propName === 'length');

const concatIfBothExists = <T>(
  base: undefined | null | T[],
  next: undefined | null | T[]
): null | T[] => (base && next ? base.concat(next) : next || base) || null;

export const concatOptions = (
  base: MockOptionsInput,
  next: MockOptionsInput
): MockOptionsInput => ({
  ...base,
  ...next,
  middlewares: concatIfBothExists(base.middlewares, next.middlewares),
  includeProperties: concatIfBothExists(
    base.includeProperties,
    next.includeProperties
  ),
  excludeProperties: concatIfBothExists(
    base.excludeProperties,
    next.excludeProperties
  ),
});

export const formatUnproxifiable = (s: any): string =>
  typeof s === 'string'
    ? `"${s}"`
    : typeof s === 'symbol'
    ? s.toString()
    : s instanceof Promise
    ? 'a Promise'
    : String(s);

export const checkPropIsSetter = (
  obj: Record<string, any>,
  prop: string | symbol | number
): boolean => {
  let target = obj;
  // eslint-disable-next-line no-cond-assign
  do {
    const desc = Object.getOwnPropertyDescriptor(target, prop);

    if (desc !== undefined) {
      return desc.set !== undefined;
    }
  } while ((target = Object.getPrototypeOf(target)) !== null);

  return false;
};
