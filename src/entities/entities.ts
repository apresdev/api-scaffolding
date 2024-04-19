import { OpenAPIV3 } from "openapi-types";

import { toSchemaObject } from "../generators/openapi/entities";
import { AnySchema, EntitySchema, MutationKeywords } from "../specification";

export type EntitySchemaVisitor = (
  schema: EntitySchema | AnySchema | OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  path: string,
) => void;

export function visitSchema(
  schema: EntitySchema | AnySchema | OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  visitor: EntitySchemaVisitor,
  path: string = "",
) {
  if (!schema) {
    return;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Process the current schema.
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  visitor(schema, path);

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Walk through any schemas for array items.
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if ("items" in schema) {
    const items = schema.items;
    visitSchema(items, visitor, path.length > 0 ? path + ".items" : "items");
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Walk through any schemas for object properties.
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if ("properties" in schema) {
    const properties = schema.properties || {};
    Object.keys(properties).forEach((property) => {
      visitSchema(properties[property], visitor, path.length > 1 ? path + ".properties." + property : "properties." + property);
    });
  }

  if ("additionalProperties" in schema) {
    const additionalProperties = schema.additionalProperties;
    if (typeof additionalProperties === "object") {
      visitSchema(additionalProperties, visitor, path);
    }
  }
}

export function asSchemaObject(schema: AnySchema): OpenAPIV3.SchemaObject {
  return toSchemaObject(schema);
  // const schemaDef = Object.assign({}, schema);

  // // TODO: Figure out what to do with EntityModel if and when we change the type.
  // removeExtensionKeywords(schemaDef as EntitySchema);

  // return schemaDef as OpenAPIV3.SchemaObject;
}

/**
 * The collection of property keyword extensions to be removed from the output schema.
 */
const propertyKeywordExtensions = ["calculated", "data-classification"];

/**
 * The collection of entity keyword extensions to be removed from the output schema.
 */
const entityKeywordExtensions: Array<string> = [
  "singleton",
  "alias",
  "ownership",
  "versioned",
  "sensitive",
  "examples",
  ...Object.values(MutationKeywords),
];
export function removeExtensionKeywords(entityModel: EntitySchema | AnySchema | OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject) {
  visitSchema(entityModel, (value: EntitySchema | AnySchema | OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): void => {
    if (typeof value === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schema = value as any;

      if (!schema.example && schema.examples && schema.examples.length > 0) {
        schema.example = schema.examples[0];
      }

      [...entityKeywordExtensions, ...propertyKeywordExtensions].forEach((keyword: string): void => {
        schema["x-apres-" + keyword] = schema[keyword];
        delete schema[keyword];
      });
    }
  });
}
