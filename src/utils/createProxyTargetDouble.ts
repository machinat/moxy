import { Proxifiable } from '../types';

const createProxyTargetDouble = (source: Proxifiable): Proxifiable =>
  typeof source === 'function' ? function moxyDouble() {} : Object.create(null);

export default createProxyTargetDouble;
