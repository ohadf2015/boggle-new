declare module 'bad-words' {
  interface FilterOptions {
    emptyList?: boolean;
    list?: string[];
    placeHolder?: string;
    regex?: RegExp;
    replaceRegex?: RegExp;
    splitRegex?: RegExp;
  }

  class Filter {
    constructor(options?: FilterOptions);
    list: string[];
    placeHolder: string;
    addWords(...words: string[]): void;
    removeWords(...words: string[]): void;
    clean(text: string): string;
    isProfane(text: string): boolean;
  }

  export default Filter;
  export = Filter;
}
