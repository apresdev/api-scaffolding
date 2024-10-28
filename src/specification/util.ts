/**
 * Finds a value in a map at a given key, or creates a new value and adds it to the map with the given key, then returns the value.
 *
 * @param map         The map containing all of the key/value pairs.
 * @param key         The key where the value is expected to reside.
 * @param supplierFn  The supplier function that creates a node from a given key.
 *
 * @returns The value that exists at the given key (either pre-existing or created via the supplier function).
 */
export function getOrSet<K, V>(map: Map<K, V>, key: K, supplierFunction: (key: K) => V): V {
  const value = map.get(key);
  if (value) {
    return value;
  }

  const node = supplierFunction(key);
  map.set(key, node);

  return node;
}
