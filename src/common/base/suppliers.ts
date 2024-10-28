import { Transform } from "./functions";

import { checkNotNull } from ".";

export type Supplier<T> = () => T;

/**
 * Useful suppliers.
 * All methods return serializable suppliers as long as they're given serializable parameters.
 */
export class Suppliers {
  /**
   * Hide the constructor of the utility class.
   */
  private constructor() {
    throw new Error("assertion error");
  }

  /**
   * Returns a supplier that always supplies instance.
   *
   * @param instance  the value to supply.
   *
   * @returns a supplier that always supplies instance.
   */
  public static of<T>(instance: T): Supplier<T> {
    return () => instance;
  }

  /**
   * Returns a supplier which caches the instance retrieved during the first call to get() and returns that value on subsequent calls to get
   * (). See: memoization
   *
   * When the underlying delegate throws an exception then this memoizing supplier will keep delegating calls until it returns valid data.
   *
   * If `delegate` is an instance created by an earlier call to memoize, it is returned directly.
   *
   * @param delegate
   *
   * @returns a memoized supplier.
   */
  public static memoize<T>(delegate: Supplier<T>): Supplier<T> {
    checkNotNull(delegate, "delegate must not be null");
    return Suppliers.of(delegate());
  }

  /**
   * Returns a new supplier which is the composition of the provided function and supplier. In other words, the new supplier's value will
   * be computed by retrieving the value from supplier, and then applying function to that value. Note that the resulting supplier will not
   * call supplier or invoke function until it is called.
   *
   * @param transform The transformation function.
   * @param delegate  The delegate supplier
   *
   * @returns a supplier that transforms the delegated supplier's value.
   */
  public static compose<F, T>(transform: Transform<F, T>, delegate: Supplier<F>): Supplier<T> {
    checkNotNull(transform, "transform must not be null");
    checkNotNull(delegate, "delegate must not be null");

    return () => {
      return transform(delegate());
    };
  }
}
