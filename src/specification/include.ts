import { Objects } from "../common";

export type IncludePaths = IncludePath[];
export type IncludePath = string;
export interface IncludeDirective {
  $include: IncludePath | IncludePaths;
}

export function isIncludeDirective(value: unknown): boolean {
  return typeof value === "object" && Object.keys(Objects.orEmpty(value)).length === 1 && "$include" in Objects.orEmpty(value);
}
