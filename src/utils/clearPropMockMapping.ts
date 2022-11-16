import { PropMockMapping } from '../types';

export const clearPropMockMapping = (mapping: PropMockMapping): void => {
  Reflect.ownKeys(mapping).forEach(k => {
    mapping[k].clear();
  });
};

export default clearPropMockMapping;
