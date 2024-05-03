import { JsonPath } from "../common";
import { PathError } from "../common/io";

import {
  AnySchema,
  Cardinality,
  EntityName,
  EntityProjection,
  EntitySchema,
  JoinDirective,
  Node,
  Nodes,
  ObjectSchema,
  ViaEntry,
  isEntityProjection,
} from ".";
import { QueryProcessorContext } from "../generators/openapi/queries/query-generator";

export class Joins {
  private constructor() {}

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

  // public static joinSchema(join: JoinDirective, schema: EntitySchema, jsonPath: string, context: QueryProcessorContext): AnySchema {
  //   if (Joins.isViaEntry(join)) {
  //     return schema;
  //   }

  //   return EntityProjections.projectionSchema(join as EntityProjection, schema, jsonPath, context);
  // }
}

export class EntityProjections {
  private constructor() {}

  public static viaFrom(projection: EntityProjection): ViaEntry {
    const keys = Object.keys(projection);
    if (keys.length !== 1) {
      throw new Error("invalid entity projection, expected 1 key, found" + keys.length);
    }
    return keys[0];
  }

  public static projectionSchema(
    entityProjection: EntityProjection,
    entityName: EntityName,
    jsonPath: string,
    context: QueryProcessorContext,
  ): AnySchema {
    const schema = context.schemaRegistry.get(entityName) as EntitySchema;

    let node: Node;
    if (context.graph.has(entityName)) {
      node = context.graph.get(entityName);
    }

    const result: ObjectSchema = {
      type: "object",
      properties: {},
    };

    entityProjection[Joins.viaFrom(entityProjection)].forEach((joinDirective: JoinDirective, index): void => {
      result.properties = result.properties || {};
      schema.properties = schema.properties || {};

      const fieldName = Joins.viaFrom(joinDirective);

      if ("*" === fieldName) {
        result.properties = { ...schema.properties, ...result.properties };
        return;
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
          const entityName = propertySchema["rel"];
          // const joinSchema = context.schemaRegistry.get(entityName);
          propertySchema = EntityProjections.projectionSchema(
            joinDirective as EntityProjection,
            entityName,
            JsonPath.resolve(jsonPath, fieldName),
            context,
          );
        } else {
          if ("type" in propertySchema && propertySchema.type === "array") {
            if ("rel" in propertySchema.items) {
              const entityName = propertySchema.items["rel"];
              // const joinSchema = context.schemaRegistry.get(entityName);
              propertySchema.items = EntityProjections.projectionSchema(
                joinDirective as EntityProjection,
                entityName,
                JsonPath.resolve(jsonPath, fieldName),
                context,
              );
            }
          }
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
    });

    if ("required" in schema && "properties" in result) {
      result.required = schema.required?.filter((name) => {
        if (!result.properties) {
          return false;
        }

        return name in result.properties;
      });

      if (result.required && result.required?.length <= 0) {
        delete result.required;
      }
    }
    return result;
  }
}
