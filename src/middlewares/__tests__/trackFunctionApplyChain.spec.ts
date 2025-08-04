import moxy from '../../index.js';
import trackFunctionApplyChain from '../trackFunctionApplyChain.js';

it('track the the whole training function calls', () => {
  const add3 = moxy((a: number) => (b: number) => (c: number) => a + b + c, {
    middlewares: [trackFunctionApplyChain()],
  });

  expect(add3(1)(2)(3)).toBe(6);
  expect(add3(4)(5)(6)).toBe(15);

  const calls = add3.mock.getCalls();

  expect(calls.length).toBe(2);
  expect(calls[0].args).toEqual([[1], [2], [3]]);
  expect(calls[0].result).toBe(6);
  expect(calls[1].args).toEqual([[4], [5], [6]]);
  expect(calls[1].result).toBe(15);
});

it('fake final value', () => {
  const add3 = moxy((a: number) => (b: number) => (c: number) => a + b + c, {
    middlewares: [trackFunctionApplyChain(7)],
  });
  add3.mock.fake(() => () => () => 7);

  expect(add3(1)(2)(3)).toBe(7);

  const calls = add3.mock.getCalls();

  expect(calls.length).toBe(1);
  expect(calls[0].args).toEqual([[1], [2], [3]]);
  expect(calls[0].result).toBe(7);
});

test('multi args', () => {
  const addMultipled3 = moxy(
    // prettier-ignore
    (a: number, b: number) => (c: number, d: number) => (e: number, f: number) =>
      a * b + c * d + e * f,
    { middlewares: [trackFunctionApplyChain()] }
  );

  expect(addMultipled3(1, 2)(3, 4)(5, 6)).toBe(44);
  expect(addMultipled3(7, 8)(9, 10)(11, 12)).toBe(278);

  const calls = addMultipled3.mock.getCalls();

  expect(calls.length).toBe(2);
  expect(calls[0].args).toEqual([
    [1, 2],
    [3, 4],
    [5, 6],
  ]);
  expect(calls[0].result).toBe(44);
  expect(calls[1].args).toEqual([
    [7, 8],
    [9, 10],
    [11, 12],
  ]);
  expect(calls[1].result).toBe(278);
});

it('set curried function depth', () => {
  const seagullFn = moxy(
    (a: string) => (b: string) => (c: string) => a + b + c,
    { middlewares: [trackFunctionApplyChain(2)] }
  );

  expect(seagullFn('mine')('mine')('mine')).toBe('mineminemine');

  const calls = seagullFn.mock.getCalls();
  expect(calls.length).toBe(1);
  expect(calls[0].args).toEqual([['mine'], ['mine']]);
  expect(calls[0].result).toBeInstanceOf(Function);
});
