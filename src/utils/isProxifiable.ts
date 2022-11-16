import { Proxifiable } from '../types';

const isProxifiable = (target: any): target is Proxifiable =>
  (typeof target === 'object' &&
    target !== null &&
    !(target instanceof Promise)) ||
  typeof target === 'function';

export default isProxifiable;
