import { PropMockMapping, Proxifiable, MockOptionsInput } from './type';

export const createProxyTargetDouble = (source: Proxifiable): Proxifiable =>
  typeof source === 'function' ? function moxyDouble() {} : Object.create(null);

export const clearAllPropOfMocks = (mapping: PropMockMapping) => {
  Object.keys(mapping).forEach(k => {
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
  includeProperties: concatIfBothExists(
    base.includeProperties,
    next.includeProperties
  ),
  excludeProperties: concatIfBothExists(
    base.excludeProperties,
    next.excludeProperties
  ),
});
