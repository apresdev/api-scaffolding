import { entityIdentifier } from "../common";
import { AnySchema, ObjectSchema } from "../specification";

import { SchemaRegistry } from "./schema_registry";

export const EntityIdentifierRef = {
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
    const name = parts[parts.length - 1];
    const referencedSchema = schemaRegistry.get(name);
    return referencedSchema;
  }

  const copy: AnySchema = Object.assign({}, schema);

  if ("items" in copy) {
    copy.items = resolveFully(copy.items, schemaRegistry);
  }

  if ("properties" in copy) {
    const object = copy as ObjectSchema;
    Object.keys(object.properties || {}).forEach((property) => {
      object.properties = object.properties || {};
      object.properties[property] = resolveFully(object.properties[property], schemaRegistry);
    });
  }

  return schema;
}
