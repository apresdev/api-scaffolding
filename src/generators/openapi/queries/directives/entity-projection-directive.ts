import { OpenAPIV3 } from "openapi-types";
import { asSchemaObject, isSingleton } from "../../../../entities";
import { EntityProjection, EntitySchema } from "../../../../specification";
import { EntityProjections } from "../../../../specification/joins";
import { QueryProcessorContext } from "../query-generator";
import { EntityDirective } from "./entity-directive";

export class EntityProjectionDirective implements EntityDirective {
  private readonly _entityProjection: EntityProjection;
  private readonly _nameDirective: EntityDirective;

  constructor(entityProjection: EntityProjection, nameDirective: EntityDirective) {
    this._entityProjection = entityProjection;
    this._nameDirective = nameDirective;
  }
  asCollection(context: QueryProcessorContext): string {
    return this._nameDirective.asCollection(context);
  }

  asIdentifier(context: QueryProcessorContext): string {
    return this._nameDirective.asIdentifier(context);
  }

  isSingleton(context: QueryProcessorContext): boolean {
    return isSingleton(context.schemaRegistry.get(this.entity()) as EntitySchema);
  }

  schema(context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const projectedSchema = EntityProjections.projectionSchema(
      this._entityProjection,
      this._nameDirective.entity(),
      context.jsonPath || "",
      context,
    );

    return asSchemaObject(projectedSchema);
  }

  path(): string {
    return this._nameDirective.path();
  }

  entity(): string {
    return this._nameDirective.entity();
  }
}
