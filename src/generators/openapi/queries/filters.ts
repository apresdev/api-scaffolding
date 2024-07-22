import { OpenAPIV3 } from "openapi-types";
import { JsonPath } from "../../../common";
import { PathError } from "../../../common/io";
import { arraySchema } from "../util";

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
  if ("format" in schema) {
    switch (schema.format) {
      case "date-time":
        // Use the special type of filter for date-time fields which is currently defined in the main template.
        return DateTimeFilter;
    }
  }

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Create a safe-copy of the schema to prepare as a filter schema
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const result = clearReadOnly(Object.assign({}, schema));

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Handle type specific filters.
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if ("type" in result) {
    switch (result.type) {
      case "array":
        // Array values allow multiple values, by re-using the array schema we treat it as an "in" operator.
        if ("items" in result) {
          if ("type" in result.items) {
            // Double check that we are only filtering on an array of scalars (i.e. use the default "in" operatior)
            switch (result.items.type) {
              case "array":
              case "object":
                throw new PathError("array filters are currently only permitted on scalar data types", path, "filterableBy");
            }
          }
          result.items = clearReadOnly(result.items);
        }
        return result;
      case "object":
        if ("properties" in result && result.properties) {
          Object.keys(result.properties).forEach((property: string) => {
            result.properties = result.properties || {};
            result.properties[property] = filterOn(result.properties[property] as OpenAPIV3.SchemaObject, JsonPath.resolve(path, property));
          });
        }

        return result;
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
