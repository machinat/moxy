import { PropMockMapping, Proxifiable } from './type';

export const createProxyTargetDouble = (source: Proxifiable): Proxifiable =>
  typeof source === 'function' ? function moxyDouble() {} : Object.create(null);

export const clearAllPropOfMocks = (mapping: PropMockMapping) => {
  Object.keys(mapping).forEach(k => {
    mapping[k].clear();
  });
};

export const isProxifiable = (target: any) =>
  (typeof target === 'object' && target !== null) ||
  typeof target === 'function';

export const isFunctionProp = (source, propName) =>
  typeof source === 'function' &&
  (propName === 'prototype' || propName === 'name' || propName === 'length');
