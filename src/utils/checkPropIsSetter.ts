const checkPropIsSetter = (
  obj: Record<string, any>,
  prop: string | symbol | number
): boolean => {
  let target = obj;
  do {
    const desc = Object.getOwnPropertyDescriptor(target, prop);

    if (desc !== undefined) {
      return desc.set !== undefined;
    }
    // eslint-disable-next-line no-cond-assign
  } while ((target = Object.getPrototypeOf(target)) !== null);

  return false;
};

export default checkPropIsSetter;
