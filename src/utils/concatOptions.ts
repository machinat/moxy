import { MockOptionsInput } from '../types.js';

const concatIfBothExists = <T>(
  base: undefined | null | T[],
  next: undefined | null | T[]
): null | T[] => (base && next ? base.concat(next) : next || base) || null;

const concatOptions = (
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

export default concatOptions;
