import { OpenAPIV3 } from "openapi-types";
import { pluralize } from "../../../../common";
import { isSingleton } from "../../../../entities";
import { Node } from "../../../../specification";
import { entitySchemaReference } from "../../util";
import { QueryProcessorContext } from "../query-generator";
import { EntityDirective } from "./entity-directive";

export class NodeDirective implements EntityDirective {
  private readonly _node: Node;

  constructor(node: Node) {
    this._node = node;
  }
  asIdentifier(): string {
    return this._node.name;
  }
  asCollection(context: QueryProcessorContext): string {
    if (this.isSingleton(context)) {
      return this._node.name;
    }
    return pluralize(this._node.name);
  }
  isSingleton(context: QueryProcessorContext): boolean {
    return isSingleton(context.schemaRegistry.get(this.entity()));
  }

  schema(): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return entitySchemaReference(this._node.name);
  }

  path(): string {
    return this._node.name;
  }

  entity(): string {
    return this._node.name;
  }
}
