import Mock, { MockOptionsInput } from './mock';

function empty() {}

function moxy(target?: object | Function, options?: MockOptionsInput): any {
  const mock = new Mock(options);

  if (target === undefined) {
    return mock.proxify(empty);
  }

  return mock.proxify(target);
}

export default moxy;
