export class PathError extends Error {
  private readonly _path: string;
  private readonly _keyword: string;

  constructor(message: string, path: string, keyword: string) {
    super(message);
    this._path = path;
    this._keyword = keyword;
  }

  public get path(): string {
    return this._path;
  }
  public get keyword(): string {
    return this._keyword;
  }
}
