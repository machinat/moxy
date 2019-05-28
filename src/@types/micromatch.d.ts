interface Micromatch {
  (str: string | string[], pattern: string | string[]): string[];
  isMatch(str: string | string[], pattern: string | string[]): boolean;
}

declare const micromatch: Micromatch;

declare module 'micromatch' {
  export = micromatch;
}
