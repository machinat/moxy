import Mock from './mock.js';
import concatOptions from './utils/concatOptions.js';
import { MockOptionsInput, Proxifiable, Moxy } from './types.js';

function empty(): void {}

/** Create a mocking function with specified mock options */
const moxyFactory =
  (defaultOptions: MockOptionsInput = {}) =>
  <T extends Proxifiable = any>(
    target?: T,
    options: MockOptionsInput = {}
  ): Moxy<T> => {
    const mock = new Mock(concatOptions(defaultOptions, options));

    if (target === undefined) {
      return mock.proxify(empty as any);
    }

    return mock.proxify(target);
  };

export default moxyFactory;
