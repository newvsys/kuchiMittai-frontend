export const hasAddressSpecialCharacters = (value: string): boolean =>
  /[^a-zA-Z0-9 ]/.test(value);