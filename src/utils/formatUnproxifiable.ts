const formatUnproxifiable = (s: any): string =>
  typeof s === 'string'
    ? `"${s}"`
    : typeof s === 'symbol'
    ? s.toString()
    : s instanceof Promise
    ? 'a Promise'
    : String(s);

export default formatUnproxifiable;
