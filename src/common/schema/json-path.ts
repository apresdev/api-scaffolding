export class JsonPath {
  public static resolve(...parts: string[]): string {
    return parts.filter((part: string): boolean => part.length > 0).join(".");
  }
}
