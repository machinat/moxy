import Mock, { MockOptions } from './mock';

function empty() {}

function moxy(target?: object | Function, options?: MockOptions): any {
  const mock = new Mock(options);

  if (target === undefined) {
    return Mock.proxify(empty, mock);
  }

  return Mock.proxify(target, mock);
}

export default moxy;
