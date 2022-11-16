import Mock from '../../mock';
import trackCurriedFunction from '../trackCurriedFunction';

it('work with mock.wrap()', () => {
  const mock = new Mock();
  const add3: any = mock.proxify((a: number) => (b: number) => (c: number) =>
    a + b + c
  );

  expect(add3(1)(2)(3)).toBe(6);

  expect(add3.mock.calls.length).toBe(1);

  mock.clear();
  mock.wrap(trackCurriedFunction());

  expect(add3(1)(2)(3)).toBe(6);

  expect(add3.mock.calls.length).toBe(3);
  expect(add3.mock.calls[0].args).toEqual([1]);
  expect(add3.mock.calls[1].args).toEqual([2]);
  expect(add3.mock.calls[2].args).toEqual([3]);

  expect(typeof add3.mock.calls[0].result).toBe('function');
  expect(typeof add3.mock.calls[1].result).toBe('function');
  expect(add3.mock.calls[2].result).toBe(6);
});

it('fake final value', () => {
  const mock = new Mock();
  const add3: any = mock.proxify((a: number) => (b: number) => (c: number) =>
    a + b + c
  );

  mock.wrap(trackCurriedFunction(7));

  expect(add3(1)(2)(3)).toBe(7);

  expect(add3.mock.calls.length).toBe(3);
  expect(add3.mock.calls[0].args).toEqual([1]);
  expect(add3.mock.calls[1].args).toEqual([2]);
  expect(add3.mock.calls[2].args).toEqual([3]);

  expect(typeof add3.mock.calls[0].result).toBe('function');
  expect(typeof add3.mock.calls[1].result).toBe('function');
  expect(add3.mock.calls[2].result).toBe(7);
});
