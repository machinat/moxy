import Mock from '../mock';
import { FunctionImpl } from '../types';

const trackNewInstancesBy = (mock: Mock) => (fn: FunctionImpl) =>
  function mockInstance(...args: any[]) {
    const instance = Reflect.construct(fn, args, new.target);

    return mock.proxify(instance);
  };

export default trackNewInstancesBy;
