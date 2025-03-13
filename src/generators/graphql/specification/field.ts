import { DataType, processDataType } from ".";
import { toCamelCase } from "../../../common";

/**
 * The field name type.
 */
export type FieldName = string;

/**
 * A field represents an individual field value within a GraphQL type.
 */
export interface Field {
  /**
   * The name of the field.
   */
  name: FieldName;
  /**
   * The field's data type.
   */
  type: DataType;
  /**
   * A human-readable description of the type.
   */
  description?: string;
}

export function processField(field: Field): string {
  return `${toCamelCase(field.name)}: ${processDataType(field.type)}`;
}
