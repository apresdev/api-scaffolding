import { JsonPath } from "./processor";

export class PathError extends Error {
  private readonly _path: JsonPath;
  private readonly _keyword: string;

  constructor(message: string, path: JsonPath, keyword: string) {
    super(message);
    this._path = path;
    this._keyword = keyword;
  }

  public get path(): JsonPath {
    return this._path;
  }
  public get keyword(): string {
    return this._keyword;
  }
}
