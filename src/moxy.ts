import Mock from './mock';

function empty() {}

function moxy(target?: object | Function, options?): any {
  if (target === undefined) {
    return Mock.proxify(empty);
  }

  return Mock.proxify(target, options);
}

export default moxy;
