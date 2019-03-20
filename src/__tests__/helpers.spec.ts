import Mock from '../mock';
import Call from '../call';
import {
  equal,
  beginWith,
  endWith,
  nthIs,
  mockNewInstance,
  mockCurryFunction,
} from '../helpers';

describe('equal', () => {
  test.each`
    first                    | second                         | equality
    ${[]}                    | ${[]}                          | ${true}
    ${[]}                    | ${[123]}                       | ${false}
    ${[123]}                 | ${[]}                          | ${false}
    ${[123]}                 | ${[123]}                       | ${true}
    ${[123]}                 | ${[321]}                       | ${false}
    ${[1, 2, 3]}             | ${[1, 2, 3]}                   | ${true}
    ${[1, 2, 3]}             | ${[3, 2, 1]}                   | ${false}
    ${[1, 2, 3]}             | ${[1, 2, 3, 4, 5]}             | ${false}
    ${[{ a: 0, b: 1 }]}      | ${[{ a: 0, b: 1 }]}            | ${true}
    ${[{ a: 0, b: 1 }]}      | ${[{ a: 0, b: 2 }]}            | ${false}
    ${[{ a: 0, b: 1 }]}      | ${[{ a: 0, b: 1, c: 2 }]}      | ${false}
    ${[{ a: 0, b: 1 }]}      | ${[{ a: 0, b: 1 }, {}]}        | ${false}
    ${[[1, 2], { 3: 4 }]}    | ${[[1, 2], { 3: 4 }]}          | ${true}
    ${[{ a: { b: 'c' } }]}   | ${[{ a: { b: 'c' } }]}         | ${true}
    ${[{ a: { b: 'c' } }]}   | ${[{ a: { b: 'x' } }]}         | ${false}
    ${[{ a: { b: 'c' } }]}   | ${[{ a: { b: 'c', d: 'e' } }]} | ${false}
    ${[{ a: { b: ['c'] } }]} | ${[{ a: { b: ['c', 'd'] } }]}  | ${false}
  `('compares args $first $second are equal', ({ first, second, equality }) => {
    expect(equal(...first)(...second)).toBe(equality);
  });

  it('work with mock.fakeWhenArgs()', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeWhenArgs(equal(1, 2, 3), () => 1);

    expect(moxied()).toBe(0);
    expect(moxied(123)).toBe(0);
    expect(moxied(1, 2, 3)).toBe(1);
    expect(moxied([1, 2, 3])).toBe(0);
    expect(moxied(1, 2, 3, 4, 5)).toBe(0);
  });
});

describe('beginWith', () => {
  test.each`
    first                     | second                        | result
    ${[]}                     | ${[]}                         | ${true}
    ${[]}                     | ${[123]}                      | ${true}
    ${[123]}                  | ${[]}                         | ${false}
    ${[123]}                  | ${[123]}                      | ${true}
    ${[123]}                  | ${[123, 321]}                 | ${true}
    ${[123]}                  | ${[321, 123]}                 | ${false}
    ${[1, 2, 3]}              | ${[1, 2, 3]}                  | ${true}
    ${[1, 2, 3]}              | ${[1, 2, 3, 4, 5]}            | ${true}
    ${[1, 2, 3, 4]}           | ${[1, 2, 3]}                  | ${false}
    ${[{ a: 0, b: 1 }]}       | ${[{ a: 0, b: 1 }]}           | ${true}
    ${[0, { a: 0, b: 1 }]}    | ${[0, { a: 0, b: 2 }]}        | ${false}
    ${[{ a: 0, b: 1 }]}       | ${[{ a: 0, b: 1 }, {}]}       | ${true}
    ${[[1, 2], { 3: 4 }]}     | ${[[1, 2], { 3: 4 }, 5, 6]}   | ${true}
    ${[{ a: { b: 'c' } }]}    | ${[{ a: { b: 'c' } }]}        | ${true}
    ${[0, { a: { b: 'c' } }]} | ${[0, { a: { b: 'x' } }]}     | ${false}
    ${[{ a: { b: ['c'] } }]}  | ${[{ a: { b: ['c', 'd'] } }]} | ${false}
  `('check if $second begin with $first', ({ first, second, result }) => {
    expect(beginWith(...first)(...second)).toBe(result);
  });

  it('work with mock.fakeWhenArgs()', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeWhenArgs(beginWith(1, 2), () => 1);

    expect(moxied()).toBe(0);
    expect(moxied(123)).toBe(0);
    expect(moxied(1, 2)).toBe(1);
    expect(moxied(1, 2, 3)).toBe(1);
    expect(moxied([1, 2, 3])).toBe(0);
    expect(moxied(1, 2, 3, 4, 5)).toBe(1);
  });
});

describe('endWith', () => {
  test.each`
    first                     | second                           | result
    ${[]}                     | ${[]}                            | ${true}
    ${[]}                     | ${[123]}                         | ${false}
    ${[123]}                  | ${[]}                            | ${false}
    ${[123]}                  | ${[123]}                         | ${true}
    ${[123]}                  | ${[321, 123]}                    | ${true}
    ${[123]}                  | ${[123, 321]}                    | ${false}
    ${[1, 2, 3]}              | ${[1, 2, 3]}                     | ${true}
    ${[1, 2, 3]}              | ${[1, 2, 3, 4, 5]}               | ${false}
    ${[3, 4, 5]}              | ${[1, 2, 3, 4, 5]}               | ${true}
    ${[1, 2, 3, 4]}           | ${[2, 3, 4]}                     | ${false}
    ${[{ a: 0, b: 1 }]}       | ${[{ a: 0, b: 1 }]}              | ${true}
    ${[{ a: 0, b: 1 }]}       | ${[0, { a: 0, b: 1 }]}           | ${true}
    ${[{ a: 0, b: 1 }]}       | ${[0, { a: 0, b: 2 }]}           | ${false}
    ${[{ a: 0, b: 1 }]}       | ${[{}, { a: 0, b: 1 }]}          | ${true}
    ${[{ a: 0, b: 1 }]}       | ${[{ a: 0, b: 1 }, {}]}          | ${false}
    ${[{ 3: 4 }, 5, 6]}       | ${[[1, 2], { 3: 4 }, 5, 6]}      | ${true}
    ${[{ a: { b: 'c' } }]}    | ${[{ a: { b: 'c' } }]}           | ${true}
    ${[{ a: { b: 'c' } }, 1]} | ${[0, { a: { b: 'x' } }, 1]}     | ${false}
    ${[{ a: { b: ['c'] } }]}  | ${[0, { a: { b: ['c', 'd'] } }]} | ${false}
  `('check if $second end with $first', ({ first, second, result }) => {
    expect(endWith(...first)(...second)).toBe(result);
  });

  it('work with mock.fakeWhenArgs()', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeWhenArgs(endWith(2, 1), () => 1);

    expect(moxied()).toBe(0);
    expect(moxied(321)).toBe(0);
    expect(moxied(2, 1)).toBe(1);
    expect(moxied(3, 2, 1)).toBe(1);
    expect(moxied([3], 2, 1)).toBe(1);
    expect(moxied([3, 2, 1])).toBe(0);
    expect(moxied(5, 4, 3, 2, 1)).toBe(1);
  });
});

describe('nthIs', () => {
  test.each`
    idx  | is            | call                      | result
    ${0} | ${undefined}  | ${[]}                     | ${true}
    ${0} | ${1}          | ${[1]}                    | ${true}
    ${0} | ${1}          | ${[2]}                    | ${false}
    ${0} | ${1}          | ${[1, 2]}                 | ${true}
    ${0} | ${2}          | ${[1, 2]}                 | ${false}
    ${1} | ${2}          | ${[1, 2]}                 | ${true}
    ${0} | ${1}          | ${[1, 2, 3]}              | ${true}
    ${1} | ${2}          | ${[1, 2, 3]}              | ${true}
    ${2} | ${3}          | ${[1, 2, 3]}              | ${true}
    ${3} | ${4}          | ${[1, 2, 3]}              | ${false}
    ${1} | ${0}          | ${[1, 2, 3]}              | ${false}
    ${1} | ${[2]}        | ${[1, [2], 3]}            | ${true}
    ${1} | ${[2]}        | ${[1, [2, 2], 3]}         | ${false}
    ${1} | ${[{ x: 2 }]} | ${[1, [{ x: 2 }], 3]}     | ${true}
    ${1} | ${[{ x: 2 }]} | ${[1, [{ x: 'x' }], 3]}   | ${false}
    ${1} | ${{ x: 2 }}   | ${[1, { x: 2 }, 3]}       | ${true}
    ${1} | ${{ x: 2 }}   | ${[1, { x: 2, y: 2 }, 3]} | ${false}
  `('check if $second end with $first', ({ idx, is, call, result }) => {
    expect(nthIs(idx, is)(...call)).toBe(result);
  });

  it('work with mock.fakeWhenArgs()', () => {
    const mock = new Mock();
    const moxied: any = mock.proxify(() => 0);

    mock.fakeWhenArgs(nthIs(1, 999), () => 1);

    expect(moxied()).toBe(0);
    expect(moxied(999)).toBe(0);
    expect(moxied(1, 999)).toBe(1);
    expect(moxied(3, 999, 1)).toBe(1);
    expect(moxied(999, 0, 999)).toBe(0);
    expect(moxied([3], 999, 1)).toBe(1);
    expect(moxied([3, 2, 1], 999)).toBe(1);
    expect(moxied(5, 999, 3, 2, 1)).toBe(1);
  });
});

describe('mockNewInstance', () => {
  it('work with mock.wrap()', () => {
    const instanceMock = new Mock();

    const classMock = new Mock().wrap(mockNewInstance(instanceMock));
    class Foo { someMethod() { } } // eslint-disable-line
    const MoxiedFoo: any = classMock.proxify(Foo);

    const foo1 = new MoxiedFoo();
    expect(foo1.mock).toBe(instanceMock);

    const foo2 = new MoxiedFoo();
    expect(foo2.mock).toBe(instanceMock);

    foo1.someMethod(1);
    foo2.someMethod(2);

    expect(foo1.someMethod.mock).toBe(foo2.someMethod.mock);
    expect(foo1.someMethod.mock.calls).toEqual([
      new Call({ args: [1], instance: foo1 }),
      new Call({ args: [2], instance: foo2 }),
    ]);
  });
});

describe('mockCurryFunction', () => {
  it('work with mock.wrap()', () => {
    const mock = new Mock();
    const curry: any = mock.proxify((a: number) => (b: number) => (c: number) =>
      a + b + c
    );

    expect(curry(1)(2)(3)).toBe(6);

    expect(curry.mock.calls.length).toBe(1);

    mock.clear();
    mock.wrap(mockCurryFunction(mock));

    expect(curry(1)(2)(3)).toBe(6);

    expect(curry.mock.calls.length).toBe(3);
    expect(curry.mock.calls[0].args).toEqual([1]);
    expect(curry.mock.calls[1].args).toEqual([2]);
    expect(curry.mock.calls[2].args).toEqual([3]);

    expect(typeof curry.mock.calls[0].result).toBe('function');
    expect(typeof curry.mock.calls[1].result).toBe('function');
    expect(curry.mock.calls[2].result).toBe(6);
  });
});
