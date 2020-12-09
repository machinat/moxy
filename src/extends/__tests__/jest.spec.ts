import { factory } from '../..';
import attachJestFnMockProps from '../jest';

const MOXY = Symbol('moxy');
const moxy = factory({ accessKey: MOXY });

function addAll(...args: number[]): number {
  return args.reduce((acc, cur) => acc + cur, 0);
}

it('attaches required jest fn mock properties to Mock.prototype', () => {
  const fn: any = moxy(addAll);

  expect(fn[MOXY]._isMockFunction).toBe(true);
  expect(fn[MOXY].getMockName()).toBe('moxy');

  const ins1 = { id: 1 };

  fn();
  fn(1, 2, 3);
  fn.call(ins1, 4, 5);

  const ins2 = new fn(6); // eslint-disable-line no-new, new-cap
  ins2.id = 2;

  fn[MOXY].fakeOnce(() => {
    throw new Error('you are a bad number');
  });

  expect(fn).toThrow('you are a bad number');

  expect(fn[MOXY].mock).toEqual({
    calls: [[], [1, 2, 3], [4, 5], [6], []],
    instances: [undefined, undefined, ins1, ins2, undefined],
    results: [
      { type: 'return', value: 0 },
      { type: 'return', value: 6 },
      { type: 'return', value: 9 },
      { type: 'return', value: undefined },
      { type: 'throw', value: new Error('you are a bad number') },
    ],
  });
});

it('is compatible with jest function calling expections', () => {
  const fn: any = moxy(addAll);

  fn();
  fn(1, 2, 3);

  fn[MOXY].fakeOnce(() => {
    throw new Error('you are a bad number');
  });

  expect(() => fn(4, 5, 6)).toThrow();

  fn(7, 8, 9);

  expect(fn[MOXY]).toHaveBeenCalled();
  expect(fn[MOXY]).toHaveBeenCalledTimes(4);

  expect(fn[MOXY]).toHaveBeenCalledWith(1, 2, 3);
  expect(fn[MOXY]).toHaveBeenLastCalledWith(7, 8, 9);
  expect(fn[MOXY]).toHaveBeenNthCalledWith(3, 4, 5, 6);

  expect(fn[MOXY]).toHaveReturned();
  expect(fn[MOXY]).toHaveReturnedTimes(3);

  expect(fn[MOXY]).toHaveReturnedWith(6);
  expect(fn[MOXY]).toHaveLastReturnedWith(24);
  expect(fn[MOXY]).toHaveNthReturnedWith(1, 0);
});

describe('attachJestFnMockProps middleware', () => {
  it('attaches required jest fn mock props to the moxied function', () => {
    const fn: any = moxy(addAll, { middlewares: [attachJestFnMockProps()] });

    fn(1, 2, 3);

    expect(fn._isMockFunction).toBe(true);
    expect(fn.getMockName()).toBe('moxy');
    expect(fn.mock).toEqual({
      calls: [[1, 2, 3]],
      results: [{ type: 'return', value: 6 }],
      instances: [undefined],
    });
  });

  it('works to pass the moxied function to expect directly', () => {
    const fn: any = moxy(addAll, { middlewares: [attachJestFnMockProps()] });

    fn();
    fn(1, 2, 3);

    fn[MOXY].fakeOnce(() => {
      throw new Error('you are a bad number');
    });

    expect(() => fn(4, 5, 6)).toThrow();

    fn(7, 8, 9);

    expect(fn).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(4);

    expect(fn).toHaveBeenCalledWith(1, 2, 3);
    expect(fn).toHaveBeenLastCalledWith(7, 8, 9);
    expect(fn).toHaveBeenNthCalledWith(3, 4, 5, 6);

    expect(fn).toHaveReturned();
    expect(fn).toHaveReturnedTimes(3);

    expect(fn).toHaveReturnedWith(6);
    expect(fn).toHaveLastReturnedWith(24);
    expect(fn).toHaveNthReturnedWith(1, 0);
  });
});
