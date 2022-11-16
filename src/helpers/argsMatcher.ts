import deepEqual from 'fast-deep-equal';

/** Predicate if the calling args are deeply equal */
export const equal = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs);

/** Predicate if the beginning n calling args are deeply equal */
export const beginWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(0, expectedArgs.length));

/** Predicate if the ending n calling args are deeply equal */
export const endWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(-expectedArgs.length));

/** Predicate if the nth call arg is deeply equal */
export const nthIs = (idx: number, expected: any) => (...actualArgs: any[]) =>
  deepEqual(expected, actualArgs[idx]);
