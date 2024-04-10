import { entityIdentifier } from "../common";
import { AnySchema } from "../specification";

import { SchemaRegistry } from "./schema_registry";

export const EntityIdentifier = {
  $ref: "#/components/schemas/EntityIdentifier",
};

export function defineIdentifier(entity: string, models: SchemaRegistry, schema: AnySchema) {
  models.set(entityIdentifier(entity), schema);
}
