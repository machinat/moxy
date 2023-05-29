import { moxy } from '../..';
import Mock from '../../mock';
import isMoxy from '../isMoxy';

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
