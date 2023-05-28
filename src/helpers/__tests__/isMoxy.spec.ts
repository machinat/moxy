import moxy from '../../index.js';
import Mock from '../../mock.js';
import isMoxy from '../isMoxy.js';

it('tells if a target is moxied', () => {
  function fn() {}
  const obj = {};
  expect(isMoxy(moxy(fn))).toBe(true);
  expect(isMoxy(moxy(obj))).toBe(true);

  expect(isMoxy(new Mock().proxify(fn))).toBe(true);
  expect(isMoxy(new Mock().proxify(obj))).toBe(true);

  expect(isMoxy(fn)).toBe(false);
  expect(isMoxy(obj)).toBe(false);
});
