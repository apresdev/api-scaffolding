import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { dump } from "js-yaml";
import { read } from "yaml-import";

export function dumpYaml<T>(data: T, filename: string) {
  writeFileSync(
    filename,
    dump(data, {
      indent: 2,
      noRefs: true,
      lineWidth: 140,
    }),
    "utf8",
  );
}

export function sortKeys<T extends object>(data: T): T {
  return Object.fromEntries(
    Object.entries(data)
      .sort()
      .map(([k, v]) => [k, v]),
  ) as T;
}

export function dumpJson<T extends object>(data: T, filename: string) {
  writeFileSync(filename, JSON.stringify(data, undefined, 2), "utf8");
}

export function fileNameWithoutExtension(filename: string): string {
  return path.basename(filename, ".yaml");
}
export function directoryName(filename: string): string {
  return path.dirname(filename);
}

export function loadYaml<T>(filename: string): T {
  const contents = readFileSync(filename, "utf8");
  if (!contents) {
    throw new Error(`could not read yaml file ${filename}`);
  }
  return read(filename) as T;
}

/**
 * Makes a deep copy of any data.
 *
 * @param data  The data to be copied.
 * @returns  The deep copy of the data.
 */
export function deepCopy<T>(data: T): T {
  return structuredClone(data);
}

export type DeepReadonly<T> = Readonly<{
  [K in keyof T]: T[K] extends number | string | symbol // Is it a primitive? Then make it readonly
    ? Readonly<T[K]>
    : // Is it an array of items? Then make the array readonly and the item as well
      T[K] extends Array<infer A>
      ? Readonly<Array<DeepReadonly<A>>>
      : // It is some other object, make it readonly as well
        DeepReadonly<T[K]>;
}>;
