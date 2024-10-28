import { OpenAPIV3 } from "openapi-types";

import { toPascalCase } from "../../common";
import { removeExtensionKeywords, visitSchema } from "../../entities";
import { AnySchema, RelationshipSchema } from "../../specification";

/**
 * Converts an entity model schema into a valid JSON schema.
 *
 * @param entitySchema The entity schema to convert to a JSON schema.
 */
export function toSchemaObject(entitySchema: AnySchema): OpenAPIV3.SchemaObject {
  const schemaObject: OpenAPIV3.SchemaObject = { ...entitySchema } as unknown as OpenAPIV3.SchemaObject;

  removeLinks(schemaObject);
  removeExtensionKeywords(schemaObject);
  convertRelationshipIntoReference(schemaObject);

  return schemaObject as OpenAPIV3.SchemaObject;
}

function convertRelationshipIntoReference(schemaObject: OpenAPIV3.SchemaObject) {
  visitSchema(schemaObject, (subSchema) => {
    if ("rel" in subSchema) {
      processRelationshipSchema(subSchema as unknown as RelationshipSchema);
    }
  });
}

/**
 * Converts the rel: <entity> into a $ref: "#/components/schemas/{entity}Identifier".
 *
 * @param schema The relationship schema.
 */
function processRelationshipSchema(schema: RelationshipSchema) {
  const $reference = `#/components/schemas/${toPascalCase(schema.rel)}Identifier`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const key of Object.keys(schema)) delete (schema as any)[key];
  (schema as unknown as OpenAPIV3.ReferenceObject).$ref = $reference;
}

/**
 * Converts the rel: <entity> into a $ref: "#/components/schemas/{entity}Identifier".
 *
 * @param schema The relationship schema.
 */
function removeLinks(schema: OpenAPIV3.SchemaObject) {
  visitSchema(schema, (subSchema) => {
    if ("links" in subSchema) {
      delete subSchema.links;
    }
  });
}
