import * as fs from "fs";
import { basename, dirname } from "path";

import * as yaml from "js-yaml";
import { read } from "yaml-import";

export function dumpYaml<T>(data: T, path: string) {
  fs.writeFileSync(
    path,
    yaml.dump(data, {
      indent: 2,
      noRefs: true,
      lineWidth: 140,
    }),
    "utf8",
  );
}

export function sortKeys<T extends object>(data: T): T {
  return Object.entries(data)
    .sort()
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}) as T;
}

export function dumpJson<T extends object>(data: T, path: string) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export function fileNameWithoutExtension(path: string): string {
  return basename(path, ".yaml");
}
export function directoryName(path: string): string {
  return dirname(path);
}

export function loadYaml<T>(path: string): T {
  const contents = fs.readFileSync(path, "utf8");
  if (!contents) {
    throw new Error("could not read yaml file " + path);
  }
  return read(path) as T;
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
