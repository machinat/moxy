import moxy from '../..';
import isMoxy from '../isMoxy';
import trackCurriedFunction from '../trackCurriedFunction';

it('work with mock.wrap()', () => {
  const add3 = moxy((a: number) => (b: number) => (c: number) => a + b + c);

  expect(add3(1)(2)(3)).toBe(6);

  expect(add3.mock.getCalls().length).toBe(1);

  add3.mock.clear();
  add3.mock.wrap(trackCurriedFunction());

  expect(add3(1)(2)(3)).toBe(6);

  const calls = add3.mock.getCalls();
  expect(calls.length).toBe(3);
  expect(calls[0].args).toEqual([1]);
  expect(calls[1].args).toEqual([2]);
  expect(calls[2].args).toEqual([3]);

  expect(typeof calls[0].result).toBe('function');
  expect(typeof calls[1].result).toBe('function');
  expect(calls[2].result).toBe(6);
});

it('fake final value', () => {
  const add3 = moxy((a: number) => (b: number) => (c: number) => a + b + c);

  add3.mock.wrap(trackCurriedFunction(7));

  expect(add3(1)(2)(3)).toBe(7);

  const calls = add3.mock.getCalls();
  expect(calls.length).toBe(3);
  expect(calls[0].args).toEqual([1]);
  expect(calls[1].args).toEqual([2]);
  expect(calls[2].args).toEqual([3]);

  expect(typeof calls[0].result).toBe('function');
  expect(typeof calls[1].result).toBe('function');
  expect(calls[2].result).toBe(7);
});

it('set curried function depth', () => {
  const getSpeakFn = moxy((a: string) => (b: string) => () => a + b);

  const myFn = () => 'mineminemineminemine';
  getSpeakFn.mock.wrap(trackCurriedFunction(myFn, 2));

  const resultFn = getSpeakFn('mine')('mine');
  expect(resultFn).toBe(myFn);
  expect(isMoxy(resultFn)).toBe(false);

  const calls = getSpeakFn.mock.getCalls();
  expect(calls.length).toBe(2);
  expect(calls[0].args).toEqual(['mine']);
  expect(calls[1].args).toEqual(['mine']);

  expect(typeof calls[0].result).toBe('function');
  expect(typeof calls[1].result).toBe('function');
  expect(calls[1].result).toBe(myFn);
});
