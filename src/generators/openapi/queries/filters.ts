import { OpenAPIV3 } from "openapi-types";
import { JsonPath, Objects, toCamelCase } from "../../../common";
import { PathError } from "../../../common/io";
import { Nodes } from "../../../dependency-graph";
import { asSchemaObject } from "../../../entities";
import { EntityName, EntityProjection, EntitySchema } from "../../../specification";
import { EntityProjections, Joins } from "../../../specification/joins";
import { arraySchema } from "../util";
import { QueryProcessorContext } from "./query-generator";

/**
 * A specialized filter used for date-time fields.
 */
const DateTimeFilter: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/DateTimeFilter",
};

/**
 * Creates a filter on a given schema value.
 *
 * @param schema the source schema for which a filter will be created.
 * @param path  the path to the current filter directive.
 * @returns the schema for the filer.
 */
export function filterOn(schema: OpenAPIV3.SchemaObject, path: string): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Handle format specific filters.
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if ("format" in schema && "date-time" === schema.format) {
    // Use the special type of filter for date-time fields which is currently defined in the main template.
    return DateTimeFilter;
  }

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Create a safe-copy of the schema to prepare as a filter schema
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const result = clearReadOnly({ ...schema });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Handle type specific filters.
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if ("type" in result) {
    switch (result.type) {
      case "array": {
        // Array values allow multiple values, by re-using the array schema we treat it as an "in" operator.
        return filterOnArray(result, path);
      }
      case "object": {
        return filterOnObject(result, path);
      }
    }
  }

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Otherwise, default to the "in"-style filter.
  //
  // The in operator accepts an array of scalars of the given field type (so an array of strings, integers, or numbers, including the
  // format and other validation keywords as well).  This performans an exact match on at least one of the values provided by the client.
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  return arraySchema(result);
}

function filterOnArray(result: OpenAPIV3.ArraySchemaObject, path: string) {
  if ("items" in result) {
    if ("type" in result.items) {
      // Double check that we are only filtering on an array of scalars (i.e. use the default "in" operatior)
      switch (result.items.type) {
        case "array":
        case "object": {
          throw new PathError("array filters are currently only permitted on scalar data types", path, "filterableBy");
        }
      }
    }
    result.items = clearReadOnly(result.items);
  }
  return result;
}

function filterOnObject(result: OpenAPIV3.NonArraySchemaObject, path: string) {
  if ("properties" in result && result.properties) {
    for (const property of Object.keys(result.properties)) {
      result.properties = Objects.orEmpty(result.properties);
      result.properties[property] = filterOn(result.properties[property] as OpenAPIV3.SchemaObject, JsonPath.resolve(path, property));
    }
  }

  return result;
}

/**
 * Removes the readOnly field from a schema.
 *
 * @param schema the schema to clear
 * @returns the cleared schema.
 */
function clearReadOnly(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
  if ("readOnly" in schema) {
    delete schema.readOnly;
  }

  return schema;
}

/* eslint-disable sonarjs/cognitive-complexity */
export function filterBy(
  filterableBy: EntityProjection[],
  sourceEntity: EntityName,
  context: QueryProcessorContext,
): OpenAPIV3.SchemaObject | undefined {
  const filters: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: {},
  };

  const sourceNode = context.graph.has(sourceEntity) ? context.graph.get(sourceEntity) : undefined;

  for (const [index, join] of filterableBy.entries()) {
    const path = JsonPath.resolve(context.jsonPath || "", `${index}`);

    const entity = Joins.viaFrom(join);
    if (!sourceNode) {
      throw new PathError(`cannot join on [${sourceEntity}] as it has zero relationships`, path, "filterableBy");
    }

    let edgeSchema: EntitySchema | undefined;
    let entityName;
    if (entity === sourceEntity) {
      entityName = sourceEntity;
      edgeSchema = context.schemaRegistry.get(sourceEntity) as EntitySchema;
      if (!edgeSchema) {
        throw new PathError(`could not find schema for filterable entity ${sourceEntity}`, path, "filterableBy");
      }
    } else {
      const edge = Nodes.findEdge(sourceNode, entity);
      if (!edge) {
        throw new PathError(`could not determine filterable edge for name ${entity} from ${sourceEntity}`, path, "filterableBy");
      }

      entityName = edge.node.name;
      edgeSchema = context.schemaRegistry.get(edge.node.name) as EntitySchema;
      if (!edgeSchema) {
        throw new PathError(`could not find schema for filterable entity ${edge.name}`, path, "filterableBy");
      }
    }

    const projectionSchema = asSchemaObject(
      EntityProjections.projectionSchema(join as EntityProjection, entityName, JsonPath.resolve(path, entity), context),
    );

    for (const [propertyIndex, property] of Object.keys(Objects.orEmpty(projectionSchema.properties)).entries()) {
      // Convert the field schema into a field filter schema.
      projectionSchema.properties = Objects.orEmpty(projectionSchema.properties);
      projectionSchema.properties[property] = filterOn(
        context.schemaRegistry.resolve(projectionSchema.properties[property]),
        JsonPath.resolve(path, entity, propertyIndex.toString()),
      );
    }

    filters.properties = Objects.orEmpty(filters.properties);
    filters.properties[toCamelCase(entity)] = projectionSchema;
  }

  return filters;
}
/* eslint-enable sonarjs/cognitive-complexity */
