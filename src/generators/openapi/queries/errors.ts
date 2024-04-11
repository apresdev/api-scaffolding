import { PathError } from "../../../common/io";

export class UnknownEdgeError extends PathError {
  private readonly _entityOrRelationshp: string;

  constructor(entityOrRelationshp: string, path: string, keyword: string) {
    super(`"detected unknown edge relation ${entityOrRelationshp}`, path, keyword);
    this._entityOrRelationshp = entityOrRelationshp;
  }
}
