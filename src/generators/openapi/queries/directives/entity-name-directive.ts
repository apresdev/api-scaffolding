import { OpenAPIV3 } from "openapi-types";
import { pluralize } from "../../../../common";
import { isSingleton } from "../../../../entities";
import { EntityName } from "../../../../specification";
import { entitySchemaRef } from "../../util";
import { QueryProcessorContext } from "../query-generator";
import { EntityDirective } from "./entity-directive";

export class EntityNameDirective implements EntityDirective {
  private readonly _entityName: EntityName;

  constructor(entityName: EntityName) {
    this._entityName = entityName;
  }
  asIdentifier(): string {
    return this._entityName;
  }
  asCollection(context: QueryProcessorContext): string {
    if (this.isSingleton(context)) {
      return this._entityName;
    }
    return pluralize(this._entityName);
  }
  isSingleton(context: QueryProcessorContext): boolean {
    return isSingleton(context.schemaRegistry.get(this.entity()));
  }

  schema(): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return entitySchemaRef(this._entityName);
  }

  path(): string {
    return this._entityName;
  }

  entity(): string {
    return this._entityName;
  }
}
