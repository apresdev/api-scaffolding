import { Objects } from "../common";
import { entityIdentifier } from "../entities";
import { AnySchema, ObjectSchema } from "../specification";

import { SchemaRegistry } from "./schema-registry";

export const EntityIdentifierReference = {
  $ref: "#/components/schemas/EntityIdentifier",
};

export function defineIdentifier(entity: string, models: SchemaRegistry, schema: AnySchema) {
  models.set(entityIdentifier(entity), schema);
}

export function resolveFully(schema: AnySchema, schemaRegistry: SchemaRegistry): AnySchema {
  if (!schema) {
    return schema;
  }

  if ("$ref" in schema) {
    const parts = schema.$ref.split("/");
    const name = Objects.requireNonNull(parts.at(-1));
    const referencedSchema = schemaRegistry.get(name);
    return referencedSchema;
  }

  const copy: AnySchema = { ...schema };

  if ("items" in copy) {
    copy.items = resolveFully(copy.items, schemaRegistry);
  }

  if ("properties" in copy) {
    const object = copy as ObjectSchema;
    for (const property of Object.keys(Objects.orEmpty(object.properties))) {
      object.properties = Objects.orEmpty(object.properties);
      object.properties[property] = resolveFully(object.properties[property], schemaRegistry);
    }
  }

  return schema;
}
