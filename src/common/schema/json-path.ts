import _ from "underscore";

export class JsonPath {
  public static resolve(...parts: Array<string>): string {
    return _.chain(parts)
      .filter((part: string): boolean => part.length > 0)
      .join(".")
      .value();
  }
}
