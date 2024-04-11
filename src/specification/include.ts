export type IncludePaths = Array<IncludePath>;
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

  return "$include" in value;
}
