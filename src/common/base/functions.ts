import { Supplier } from "./suppliers";

import { Predicate, checkNotNull, isDefined } from ".";

export type Transform<F, T> = (input: F) => T;

/**
 * Static utility methods pertaining to Transform instances.
 *
 * All methods return serializable functions as long as they're given serializable parameters.
 *
 */
export class Functions {
  /**
   * Hide the constructor of a utility class.
   */
  private constructor() {}

  /**
   * Returns the composition of two functions. For f: A->B and g: B->C, composition is defined as the function h such that h(a) == g(f(a))
   * for each a.
   *
   * @param g the second function to apply
   * @param f the first function to apply
   *
   * @returns the composition of f and g
   */
  public static compose<A, B, C>(g: Transform<B, C>, f: Transform<A, B>): Transform<A, C> {
    checkNotNull(g, "g compose function must not be null");
    checkNotNull(f, "f compose function must not be null");

    return (input: A) => g(f(input));
  }

  /**
   * Returns a function that ignores its input and always returns `value`.
   * @param value the constant value for the function to return
   *
   * @returns a function that always returns `value`
   */
  public static constant<F, T>(value: T): Transform<F, T> {
    return () => value;
  }

  /**
   * Returns a function that ignores its input and returns the result of `supplier()`.
   *
   * @param supplier  a supplier function.
   *
   * @returns a function that ignores its input and returns the result of `supplier()`
   */
  public static forSupplier<F, T>(supplier: Supplier<T>): Transform<F, T> {
    checkNotNull(supplier, "supplier must not be null");

    return () => supplier();
  }

  /**
   * Creates a function that returns the same boolean output as the given predicate for all inputs.
   *
   * The returned function is consistent with equals (as documented at Function.apply(F)) if and only if predicate is itself consistent
   * with equals.
   *
   * @param predicate the predicate function.
   *
   * @returns the function that returns the same boolean output as the given predicate for all inputs
   */
  public static forPredicate<F>(predicate: Predicate<F>): Transform<F, boolean> {
    checkNotNull(predicate, "predicate must not be null");
    return (input: F) => predicate(input);
  }

  /**
   * Returns a function which performs a map lookup with a default value. The function created by this method returns `defaultValue` for all
   * inputs that do not belong to the map's key set. If no `defaultValue` is given then the function throws an exception in this case.
   *
   * @param map           source map that determines the function behavior
   * @param defaultValue  the value to return for inputs that aren't map keys
   *
   * @returns function that returns map.get(a) when a is a key, or defaultValue otherwise
   */
  public static forMap<K, V>(map: Map<K, V>, defaultValue?: V | Supplier<V>): Transform<K, V> {
    checkNotNull(map, "map must not be null");
    return (key: K): V => {
      if (map.has(key)) {
        return map.get(key) as V;
      }

      if (!isDefined(defaultValue)) {
        throw new Error("no value at given key " + key);
      }

      if (typeof defaultValue === "function") {
        return (defaultValue as Supplier<V>)();
      }

      return defaultValue as V;
    };
  }

  /**
   * Returns a function which performs a map lookup with a default value. The function created by this method returns `defaultValue` for all
   * inputs that do not belong to the map's key set. If no `defaultValue` is given then the function throws an exception in this case.
   *
   * @param map           source map that determines the function behavior
   * @param defaultValue  the value to return for inputs that aren't map keys
   *
   * @returns function that returns map[a] when a is a key, or defaultValue otherwise
   */
  public static forRecord<K extends string | number | symbol, V>(map: Record<K, V>, defaultValue?: V | Supplier<V>): Transform<K, V> {
    checkNotNull(map, "map must not be null");
    return (key: K): V => {
      if (key in map) {
        return map[key];
      }

      if (!isDefined(defaultValue)) {
        throw new Error("no value at given key " + String(key));
      }

      if (typeof defaultValue === "function") {
        return (defaultValue as Supplier<V>)();
      }

      return defaultValue as V;
    };
  }

  /**
   * Returns the identity function.
   *
   * @returns the identity function.
   */
  public static identity<T>(): Transform<T, T> {
    return (input: T) => input;
  }

  /**
   * Returns a function that simply invokes toString on its argument and returns the result. It throws an error on null input.
   *
   * @returns a function that simply invokes toString on its argument and returns the result
   */
  public static toString<T>(): Transform<T, string> {
    return (input: T) => {
      checkNotNull(input, "toString input must not be null");
      return String(input);
    };
  }
}
