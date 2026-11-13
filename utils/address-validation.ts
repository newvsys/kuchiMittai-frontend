export const hasAddressSpecialCharacters = (value: string): boolean =>
  /[@#$%^&*]/.test(value);