import { PropMockMapping, Proxifiable, MockOptionsInput } from './type';

export const createProxyTargetDouble = (source: Proxifiable): Proxifiable =>
  typeof source === 'function' ? function moxyDouble() {} : Object.create(null);

export const clearPropMockMapping = (mapping: PropMockMapping) => {
  Reflect.ownKeys(mapping).forEach(k => {
    // @ts-ignore wait for symbol index supported
    mapping[k].clear();
  });
};

export const isProxifiable = (target: any) =>
  (typeof target === 'object' &&
    target !== null &&
    !(target instanceof Promise)) ||
  typeof target === 'function';

export const isFunctionProp = (source, propName) =>
  typeof source === 'function' &&
  (propName === 'prototype' || propName === 'name' || propName === 'length');

const concatIfBothExists = (base: any[], next: any[]) =>
  base && next ? base.concat(next) : next || base;

export const concatOptions = (
  base: MockOptionsInput,
  next: MockOptionsInput
): MockOptionsInput => ({
  ...base,
  ...next,
  middlewares: concatIfBothExists(base.middlewares, next.middlewares),
  includeProps: concatIfBothExists(base.includeProps, next.includeProps),
  excludeProps: concatIfBothExists(base.excludeProps, next.excludeProps),
});

export const formatUnproxifiable = s =>
  // prettier-ignore
  typeof s === 'string'
    ? `"${s}"`
    : typeof s === 'symbol'
    ? s.toString()
    : s instanceof Promise
    ? 'a Promise'
    : s;

export const checkPropIsSetter = (
  obj: Object,
  prop: string | symbol | number
) => {
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
