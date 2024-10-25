// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Predicates.

import { checkNotEmpty, checkNotNull, isDefined } from ".";

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export type Predicate<T> = (input: T) => boolean;

export class Predicates {
  /**
   * Hide the constructor of the utility class.
   */
  private constructor() {
    throw new Error("assertion error");
  }

  /**
   * Returns a predicate that evaluates to true if each of its components evaluates to true. The components are evaluated in order, and
   * evaluation will be "short-circuited" as soon as a false predicate is found. It defensively copies the array passed in, so future
   * changes to it won't alter the behavior of this predicate.
   *
   * @param predicates  the collection of component predicates to evaluate
   *
   * @returns a predicate that evaluates to true if each of its components evaluates to true.
   *
   * @throws if the no component predicates are given.
   */
  public static and<T>(...predicates: Array<Predicate<T>>): Predicate<T> {
    checkNotEmpty(predicates, "predicates must not be empty");
    for (const inner of predicates) checkNotNull(inner, "predicates must not be null");

    return (value: T): boolean => {
      for (const predicate of predicates) {
        if (!predicate(value)) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * Returns a predicate that evaluates to true if either of its components evaluates to true. The components are evaluated in order, and
   * evaluation will be "short-circuited" as soon as a true predicate is found.  It defensively copies the array passed in, so future
   * changes to it won't alter the behavior of this predicate.
   *
   * @param predicates  the collection of component predicates to evaluate
   *
   * @returns a predicate that evaluates to true if either of its components evaluates to true.
   *
   * @throws if the no component predicates are given.
   */
  public static or<T>(...predicates: Array<Predicate<T>>): Predicate<T> {
    checkNotEmpty(predicates, "predicates must not be empty");
    for (const inner of predicates) checkNotNull(inner, "predicates must not be null");

    return (value: T): boolean => {
      for (const predicate of predicates) {
        if (predicate(value)) {
          return true;
        }
      }
      return false;
    };
  }

  /**
   * Returns a predicate that evaluates to true if the given predicate evaluates to false.
   *
   * @param predicate the given predicate to "not".
   *
   * @returns a predicate that evaluates to true if the given predicate evaluates to false.
   *
   * @throws if the predicate is null or undefined.
   */
  public static not<T>(predicate: Predicate<T>): Predicate<T> {
    checkNotNull(predicate, "predicate must not be null");

    return (input: T) => {
      return !predicate(input);
    };
  }

  /**
   * Returns a predicate that evaluates to true if the value is a string.
   *
   * @returns a predicate that evaluates to true if the value is a string.
   */
  public static isString(): Predicate<unknown> {
    return (value: unknown) => {
      return typeof value === "string";
    };
  }

  /**
   * Returns a predicate that evaluates to true if the value is an array.
   *
   * @returns a predicate that evaluates to true if the value is an array.
   */
  public static isArray(): Predicate<unknown> {
    return (value: unknown) => {
      return Array.isArray(value);
    };
  }

  /**
   * Returns a predicate that evaluates to true if each item in the supplied value evaluates to true against a given predicate.
   * The items are evaluated in order, and evaluation will be "short-circuited" as soon as a falsey item is found.
   *
   * @param predicate The predicate used to evaluate the array items.
   *
   * @returns  a predicate that evaluates to true if each item in the supplied value evaluates to true against a given predicate.
   */
  public static eachArrayItem<T>(predicate: Predicate<T>): Predicate<T[]> {
    checkNotNull(predicate, "predicate must not be null");

    return (values: T[]) => {
      if (!values) {
        return false;
      }

      if (!Array.isArray(values)) {
        return false;
      }

      for (const value of values) {
        if (!predicate(value)) {
          return false;
        }
      }

      return true;
    };
  }

  /**
   * Returns a predicate that always returns true.
   *
   * @returns a predicate that always returns true.
   */
  public static alwaysTrue<T>(): Predicate<T> {
    return () => {
      return true;
    };
  }

  /**
   * Returns a predicate that always returns false.
   *
   * @returns a predicate that always returns false.
   */
  public static alwaysFalse<T>(): Predicate<T> {
    return () => {
      return false;
    };
  }

  /**
   * Returns a predicate that returns true if and only if the supplied value is not `undefined` and is not null.
   *
   * @returns a predicate that returns true if and only if the supplied value is not `undefined` and is not null.
   */
  public static notNull<T>(): Predicate<T> {
    return (input: T) => {
      return isDefined(input);
    };
  }

  /**
   * Returns a predicate that returns true if and only if the supplied value is not `undefined`, is not null, and has a non-zero length.
   *
   * @returns a predicate that returns true if and only if the supplied value is not `undefined`, is not null, and has a non-zero length.
   */
  public static notEmpty<T extends string | unknown[]>(): Predicate<T> {
    return (input: T) => {
      return isDefined(input) && input.length > 0;
    };
  }
}
