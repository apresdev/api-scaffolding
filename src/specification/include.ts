export type IncludePaths = IncludePath[];
export type IncludePath = string;
export interface IncludeDirective {
  $include: IncludePath | IncludePaths;
}

export function isIncludeDirective(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (typeof value !== "object") {
    return false;
  }

  return Object.keys(value).length === 1 && "$include" in value;
}
