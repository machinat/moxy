import '../jest';
import moxy from '../..';

function addAll(...args: number[]): number {
  return args.reduce((acc, cur) => acc + cur, 0);
}

it('attaches required jest fn mock properties to Mock.prototype', () => {
  const fn: any = moxy(addAll);

  expect(fn._isMockFunction).toBe(true);
  expect(fn.getMockName()).toBe('moxy(addAll)');

  const ins1 = { id: 1 };

  fn();
  fn(1, 2, 3);
  fn.call(ins1, 4, 5);

  const ins2 = new fn(6); // eslint-disable-line no-new, new-cap
  ins2.id = 2;

  fn.mock.fakeOnce(() => {
    throw new Error('bad bad number');
  });

  expect(fn).toThrow('bad bad number');

  expect(fn.mock.mock).toBe(fn.mock);
  expect(fn.mock.calls).toEqual([[], [1, 2, 3], [4, 5], [6], []]);
  expect(fn.mock.instances).toEqual([
    undefined,
    undefined,
    ins1,
    ins2,
    undefined,
  ]);
  expect(fn.mock.results).toEqual([
    { type: 'return', value: 0 },
    { type: 'return', value: 6 },
    { type: 'return', value: 9 },
    { type: 'return', value: undefined },
    { type: 'throw', value: new Error('bad bad number') },
  ]);
});

it('is compatible with jest function calling expections', () => {
  const fn: any = moxy(addAll);

  fn();
  fn(1, 2, 3);

  fn.mock.fakeOnce(() => {
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
