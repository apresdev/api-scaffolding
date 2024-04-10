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
  const schemaObj: OpenAPIV3.SchemaObject = Object.assign({}, entitySchema) as unknown as OpenAPIV3.SchemaObject;

  removeLinks(schemaObj);
  removeExtensionKeywords(schemaObj);
  convertRelIntoRef(schemaObj);

  return schemaObj as OpenAPIV3.SchemaObject;
}

function convertRelIntoRef(schemaObj: OpenAPIV3.SchemaObject) {
  visitSchema(schemaObj, (subSchema) => {
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
  const $ref = "#/components/schemas/" + toPascalCase(schema.rel) + "Identifier";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.keys(schema).forEach((key) => delete (schema as any)[key]);
  (schema as unknown as OpenAPIV3.ReferenceObject).$ref = $ref;
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
