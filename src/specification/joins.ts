import { JsonPath } from "../common";
import { PathError } from "../common/io";

import { AnySchema, EntityProjection, EntitySchema, JoinDirective, ObjectSchema, ViaEntry } from ".";

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

  public static joinSchema(join: JoinDirective, schema: EntitySchema, jsonPath: string): AnySchema {
    if (Joins.isViaEntry(join)) {
      return schema;
    }

    return EntityProjections.projectionSchema(join as EntityProjection, schema, jsonPath);
  }
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

  public static projectionSchema(entityProjection: EntityProjection, schema: EntitySchema, jsonPath: string): AnySchema {
    const entityName = Joins.viaFrom(entityProjection);

    const result: ObjectSchema = {
      type: "object",
      properties: {},
    };

    entityProjection[entityName].forEach((fieldName: string, index): void => {
      result.properties = result.properties || {};
      schema.properties = schema.properties || {};

      const itemPropertySchema = schema.properties[fieldName];
      if (!itemPropertySchema) {
        throw new PathError(
          `detected invalid join field [${fieldName}] on join [${entityName}]`,
          JsonPath.resolve(jsonPath, String(index)),
          "projection",
        );
      }
      result.properties[fieldName] = schema.properties[fieldName];
    });

    return result;
  }
}
