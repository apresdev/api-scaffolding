/**
 * A utility class for work with TypeScript objects.
 */
export class Arrays {
  /**
   * Hide the constructor of the utility class.
   */
  private constructor() {
    throw new Error("assertion error");
  }

  /**
   * Ensures that an array is defined.
   *
   * Returns the original array is defined and not null.  Otherwise it returns a new empty array.
   *
   * This is particularly useful for working with interfaces with optional array properties.  Specifically if you want to read or write
   * properties on optional array.  This helps to reduce branch coverage checks by eliminating inline "value || []" statements.
   *
   * @param value The potentially null or undefined array.
   * @returns the original array if it is non-null, or an empty array otherwise.
   */
  static orEmpty<T>(value: T[] | null | undefined): T[] {
    if (!value) {
      return [] as T[];
    }
    return value;
  }
}
