import { PropMockMapping } from '../types';

export const clearPropMockMapping = (mapping: PropMockMapping): void => {
  Reflect.ownKeys(mapping).forEach(k => {
    // @ts-ignore wait for symbol index supported
    mapping[k].clear();
  });
};

export default clearPropMockMapping;
