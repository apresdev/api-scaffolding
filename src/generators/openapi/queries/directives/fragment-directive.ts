import { OpenAPIV3 } from "openapi-types";
import { pluralize } from "../../../../common";
import { isSingleton } from "../../../../entities";
import { Fragment } from "../../../../specification";
import { Joins } from "../../../../specification/joins";
import { entitySchemaReference } from "../../util";
import { QueryProcessorContext } from "../query-generator";
import { EntityDirective } from "./entity-directive";

export class FragmentDirective implements EntityDirective {
  private readonly _fragment: Fragment;

  constructor(fragment: Fragment) {
    this._fragment = fragment;
  }

  asCollection(context: QueryProcessorContext): string {
    if (this.isSingleton(context)) {
      return this.entity();
    }
    return pluralize(this.entity());
  }

  asIdentifier(): string {
    return this.entity();
  }

  isSingleton(context: QueryProcessorContext): boolean {
    return isSingleton(context.schemaRegistry.get(this.entity()));
  }

  schema(): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return entitySchemaReference(this._fragment.name);
  }

  path(): string {
    return this.entity();
  }

  entity(): string {
    return Joins.viaFrom(this._fragment.on);
  }
}
