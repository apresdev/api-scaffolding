/**
 * A utility class for work with TypeScript objects.
 */
export class Objects {
  /**
   * Hide the constructor of the utility class.
   */
  private constructor() {
    throw new Error("assertion error");
  }

  /**
   * Ensures that an object is defined.
   *
   * Returns the original object if it is defined and not null.  Otherwise it returns a new empty object.
   *
   * This is particularly useful for working with interfaces with optional object properties.  Specifically if you want to read or write
   * properties on optional objects.  This helps to reduce branch coverage checks by eliminating inline "value || {}" statements.
   *
   * @param value The potentially null or undefined object.
   * @returns the original object if it is non-null, or an empty object otherwise.
   */
  static orEmpty<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
      return {} as T;
    }
    return value;
  }

  /**
   * Ensures that an object is defined.
   *
   * Returns the original object if it is defined and not null.  Otherwise it returns the defaultValue.
   *
   * This is particularly useful for working with interfaces with optional object properties.  Specifically if you want to read or write
   * properties on optional objects.  This helps to reduce branch coverage checks by eliminating inline "value || {}" statements.
   *
   * @param value The potentially null or undefined object.
   * @returns the original object if it is non-null, or an empty object otherwise.
   */
  static orElse<T>(value: T | null | undefined, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return value;
  }
  /**
   * Ensures that an object is defined.
   *
   * Returns the original object if it is defined and not null.  Otherwise it throws an error.
   *
   * This is particularily useful for working with interfaces with optional object properties.  Specifically if you want to read or write
   * properties on optional objects.  This helps to reduce branch coverage checks by eliminating if( defined ) checks.
   *
   * @param value The potentially null or undefined object.
   * @returns the original object.
   * @throws an error if the value is null or undefined.
   */
  static requireNonNull<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
      throw new Error("value must not be null");
    }
    return value;
  }

  /**
   * Checks to see if the value has a non-null, non-undefined value.
   *
   * @param value The potentially null or undefined object.
   * @returns  true if the value is not null nor undefined.
   */
  static isDefined<T>(value: T | null | undefined): boolean {
    return value !== null && value !== undefined;
  }
}
