// Only a URL with nothing after the path is a stray visit; any param (code, tokens, #error) is a real return.
export function isBareCallbackVisit(input: { search: string; hash: string }): boolean {
  return input.search.replace(/^\?/, '') === '' && input.hash.replace(/^#/, '') === '';
}
