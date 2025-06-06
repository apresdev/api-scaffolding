import { JsonPath, Objects } from "../common";
import { PathError } from "../common/io";

import {
  AnySchema,
  Cardinality,
  EntityName,
  EntityProjection,
  EntitySchema,
  JoinDirective,
  ObjectSchema,
  ViaEntry,
  isEntityProjection,
} from ".";
import { Node, Nodes } from "../dependency-graph";
import { QueryProcessorContext } from "../generators/openapi/queries/query-generator";

export class Joins {
  private constructor() {
    throw new Error("assertion error");
  }

  public static isViaEntry(join: JoinDirective): boolean {
    return typeof join === "string";
  }
  public static isEntityProjection(join: JoinDirective): boolean {
    return typeof join === "object";
  }

  public static viaFrom(join: JoinDirective): ViaEntry {
    if (Joins.isViaEntry(join)) {
      return join as ViaEntry;
    }

    if (Joins.isEntityProjection(join)) {
      return EntityProjections.viaFrom(join as EntityProjection);
    }

    throw new Error("unsupported join directive");
  }


  public static directives(join: EntityProjection): JoinDirective[] {

    const keys = Object.keys(join)
    if( keys.length !== 1 ) {
      throw new Error("detected entity projection with non-singular key: " + join)
    }

    return join[keys[0]]

  }
}

export class EntityProjections {
  private constructor() {
    throw new Error("assertion error");
  }

  public static viaFrom(projection: EntityProjection): ViaEntry {
    const keys = Object.keys(projection);
    if (keys.length !== 1) {
      throw new Error(`invalid entity projection, expected 1 key, found${keys.length}`);
    }
    return keys[0];
  }

  /* eslint-disable sonarjs/cognitive-complexity */
  public static projectionSchema(
    entityProjection: EntityProjection,
    entityName: EntityName,
    jsonPath: string,
    context: QueryProcessorContext,
  ): AnySchema {
    const schema = context.schemaRegistry.get(entityName) as EntitySchema;

    let node: Node | undefined = undefined;
    if (context.graph.has(entityName)) {
      node = context.graph.get(entityName);
    }

    const result: ObjectSchema = {
      type: "object",
      properties: {},
    };

    // This is really complicated and I think I'd rather fix this in a re-write.

    for (const [index, joinDirective] of entityProjection[Joins.viaFrom(entityProjection)].entries()) {
      result.properties = Objects.orEmpty(result.properties);
      schema.properties = Objects.orEmpty(schema.properties);

      const fieldName = Joins.viaFrom(joinDirective);

      if ("*" === fieldName) {
        result.properties = { ...schema.properties, ...result.properties };
        continue;
      }

      let propertySchema: AnySchema;

      if (isEntityProjection(joinDirective)) {
        propertySchema = schema.properties[fieldName];

        if (!propertySchema && node) {
          const edge = Nodes.findEdge(node, fieldName);
          if (edge) {
            propertySchema = EntityProjections.projectionSchema(
              joinDirective as EntityProjection,
              edge.node.name,
              JsonPath.resolve(jsonPath, fieldName),
              context,
            );
            if (Cardinality.isToMany(edge.cardinality)) {
              propertySchema = { type: "array", items: propertySchema };
            }
          }
        }

        if ("rel" in propertySchema) {
          const relationship = propertySchema["rel"];
          // const joinSchema = context.schemaRegistry.get(entityName);
          propertySchema = EntityProjections.projectionSchema(
            joinDirective as EntityProjection,
            relationship,
            JsonPath.resolve(jsonPath, fieldName),
            context,
          );
        } else if ("type" in propertySchema && propertySchema.type === "array" && "rel" in propertySchema.items) {
          const relationship = propertySchema.items["rel"];
          // const joinSchema = context.schemaRegistry.get(entityName);
          propertySchema.items = EntityProjections.projectionSchema(
            joinDirective as EntityProjection,
            relationship,
            JsonPath.resolve(jsonPath, fieldName),
            context,
          );
        }
      } else {
        propertySchema = schema.properties[fieldName];
        if (!propertySchema && node) {
          const edge = Nodes.findEdge(node, fieldName);
          if (edge) {
            propertySchema = context.schemaRegistry.get(edge.node.name);
          }
        }
      }

      if (!propertySchema) {
        throw new PathError(
          `detected invalid join field [${fieldName}] on join [${entityName}]`,
          JsonPath.resolve(jsonPath, String(index)),
          "projection",
        );
      }
      result.properties[fieldName] = propertySchema;
    }

    return EntityProjections.pruneRequired(schema, result);
  }
  /* eslint-enable sonarjs/cognitive-complexity */

  /**
   * Prunes the required and requiresOneOf properties to only include properties that exist in the ObjectSchema.
   *
   * @param schema The original object schema.
   * @param result The projected object schema.
   * @returns The Object schema with the properties pruned.
   */
  private static pruneRequired(schema: EntitySchema, result: ObjectSchema): ObjectSchema {
    if ("required" in schema && "properties" in result) {
      result.required = schema.required?.filter((name) => {
        return name in Objects.requireNonNull(result.properties);
      });

      if (result.required && result.required?.length <= 0) {
        delete result.required;
      }
    }

    if ("requiresOneOf" in schema && "properties" in result) {
      result.requiresOneOf = schema.requiresOneOf
        ?.map((required) =>
          required.filter((name) => {
            return name in Objects.requireNonNull(result.properties);
          }),
        )
        .filter((required) => required.length > 0);

      if (result.requiresOneOf && result.requiresOneOf?.length <= 0) {
        delete result.requiresOneOf;
      }
    }

    return result;
  }
}
