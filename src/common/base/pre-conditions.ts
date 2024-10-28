// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pre-condition checks.
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { Supplier } from "./suppliers";

import { Predicates } from ".";

/**
 * Asserts that a given predicate evaluates to true.
 *
 * @param assertion The assertion to be evaluated.
 * @param message   The assertion failure message.
 *
 * @throws  error if the predicate evaluates to false.
 */
export function checkArgument(assertion: boolean, message: string): boolean;
export function checkArgument(assertion: Supplier<boolean>, message: string): boolean;
export function checkArgument(assertion: boolean | Supplier<boolean>, message: string): boolean {
  const result = typeof assertion === "boolean" ? assertion : assertion();

  if (!result) {
    throw new Error(message);
  }

  return true;
}

export function isDefined<T>(value: T): boolean {
  return value !== undefined && value !== null;
}

/**
 * Asserts that a given value is defined and not equal to null.
 *
 * @param value   The value to check.
 * @param message The assertion failure message.
 *
 * @throws  error if the value is null or undefined.
 */
export function checkNotNull<T>(value: T, message: string): boolean {
  return checkArgument(Predicates.notNull()(value), message);
}

/**
 * Asserts that a given value is defined, not equal to null, and has a positive length.
 *
 * @param value   The value to check.
 * @param message The assertion failure message.
 *
 * @throws  error if the value is null, undefined, or has a non-positive length.
 */
export function checkNotEmpty<T>(value: string | T[], message: string): boolean {
  return (
    checkNotNull(value, `value was not non-null. ${message}`) &&
    checkArgument((): boolean => {
      return value.length > 0;
    }, message)
  );
}
