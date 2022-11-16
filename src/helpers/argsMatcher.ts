import deepEqual from 'fast-deep-equal';

export const equal = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs);

export const beginWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(0, expectedArgs.length));

export const endWith = (...expectedArgs: any[]) => (...actualArgs: any[]) =>
  deepEqual(expectedArgs, actualArgs.slice(-expectedArgs.length));

export const nthIs = (idx: number, expected: any) => (...actualArgs: any[]) =>
  deepEqual(expected, actualArgs[idx]);
