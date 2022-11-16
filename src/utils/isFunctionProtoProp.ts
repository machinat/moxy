import { Proxifiable } from '../types';

const isFunctionProtoProp = (
  source: Proxifiable,
  propName: number | string | symbol
): boolean =>
  typeof source === 'function' &&
  (propName === 'prototype' || propName === 'name' || propName === 'length');

export default isFunctionProtoProp;
