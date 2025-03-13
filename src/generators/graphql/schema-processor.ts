import { toCamelCase } from "../../common";
import {
  AnySchema,
  ArraySchema,
  EntitySchema,
  NumberSchema,
  ReferenceSchema,
  RelationshipSchema,
  StringSchema,
  ValueSchema,
} from "../../specification";
import {
  DataType,
  Field,
  GraphQLSpecification,
  ListDataType,
  ObjectDataType,
  ScalarDataType,
  ScalarName,
  Type,
  TypeName,
} from "./specification";

export class SchemaProcessor {
  private readonly specification: GraphQLSpecification;

  constructor(specification: GraphQLSpecification) {
    this.specification = specification;
  }

  processEntitySchema(name: TypeName, schema: EntitySchema): Type {
    const type: Type = {
      name,
      fields: [],
      description: schema.description,
    };

    for (const [property, propertySchema] of Object.entries(schema.properties || {})) {
      const field: Field = {
        name: toCamelCase(property),
        type: this.anySchema(propertySchema),
      };

      if ("description" in propertySchema) {
        field.description = propertySchema.description;
      }

      type.fields.push(field);
    }

    return type;
  }

  /**
   * Generates a GraphQL data type from an AnySchema.
   *
   * @param schema The any schema.
   * @returns the GraphQL data type
   */
  private anySchema(schema: AnySchema): DataType {
    if ("type" in schema) {
      return this.valueSchema(schema as ValueSchema);
    }

    if ("rel" in schema) {
      return this.relSchema(schema as RelationshipSchema);
    }

    if ("$ref" in schema) {
      return this.refSchema(schema as ReferenceSchema);
    }

    throw new Error(`unsupported schema ${schema}`);
  }

  /**
   * Generates a GraphQL data type from a ValueSchema.
   *
   * @param schema The value schema.
   * @returns the GraphQL data type
   */
  private valueSchema(schema: ValueSchema): DataType {
    switch (schema.type) {
      case "object":
      case "array": {
        return this.arraySchema(schema as ArraySchema);
      }
      case "string": {
        return this.stringSchema(schema as StringSchema);
      }
      case "number":
      case "integer": {
        return this.numberSchema(schema as NumberSchema);
      }
      case "boolean": {
        return this.booleanSchema();
      }
      case "null":
    }
    return {};
  }

  /**
   * Generates a GraphQL data type from an ArraySchema.
   *
   * @param schema The array schema.
   * @returns the GraphQL data type
   */
  private arraySchema(schema: ArraySchema): ListDataType {
    return {
      items: this.anySchema(schema.items),
    };
  }

  /**
   * Generates a GraphQL data type from an BooleanSchema.
   *
   * @param schema The boolean schema.
   * @returns the GraphQL data type
   */
  private booleanSchema(): ScalarDataType {
    return {
      scalar: "Boolean",
    };
  }

  /**
   * Generates a GraphQL data type from an StringSchema.
   *
   * @param schema The string schema.
   * @returns the GraphQL data type
   */
  private stringSchema(schema: StringSchema): ScalarDataType {
    if (schema.format) {
      this.specification.scalars[schema.format] = { name: schema.format };
      return {
        scalar: schema.format as ScalarName,
      };
    }
    return {
      scalar: "String",
    };
  }

  /**
   * Generates a GraphQL data type from an NumberSchema.
   *
   * @param schema The number schema.
   * @returns the GraphQL data type
   */
  private numberSchema(schema: NumberSchema): ScalarDataType {
    if ("integer" === schema.type) {
      return {
        scalar: "Int",
      };
    }

    return {
      scalar: "Float",
    };
  }

  /**
   * Generates a GraphQL data type from an RelationshipSchema.
   *
   * @param schema The relationship schema.
   * @returns the GraphQL data type
   */
  private relSchema(schema: RelationshipSchema): ObjectDataType {
    return {
      type: schema.rel,
    };
  }

  /**
   * Generates a GraphQL data type from an ReferenceSchema.
   *
   * @param schema The reference schema.
   * @returns the GraphQL data type
   */
  private refSchema(schema: ReferenceSchema): ObjectDataType {
    const type = schema.$ref.split("/").pop();

    if (!type) {
      throw new Error(`could not determine reference entity from ${schema.$ref}`);
    }

    return {
      type,
    };
  }
}
