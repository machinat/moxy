import Mock from './mock';
import { concatOptions } from './utils';
import { MockOptionsInput, MoxyFunc } from './type';

function empty(): void {}

const moxyFactory = (defaultOptions: MockOptionsInput = {}): MoxyFunc => (
  target,
  options = {}
) => {
  const mock = new Mock(concatOptions(defaultOptions, options));

  if (target === undefined) {
    return mock.proxify(empty);
  }

  return mock.proxify(target);
};

export default moxyFactory;
