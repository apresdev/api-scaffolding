import { ValueSchema } from "./entity";
import { EntityProjection } from "./specification";

/**
 * A column name.
 */
export type ColumnName = string;

/**
 * A column data type.
 */
// export type ValueType = "integer" | "number" | "string" | "boolean";

/**
 *
 */
export interface NamedQuery {
  /**
   * The name of the query.
   */
  name: string;

  /**
   * A human-readable description of the query.
   */
  description?: string;

  /**
   * The dimensions and measures for the query.
   */
  query: QueryDefinition;

  /**
   * An example of the query response data.
   */
  example?: unknown[][];
}

export interface QueryDefinition {
  /**
   * The collection of fields that may be used for server side filtering.
   *
   * Note, this affects
   */
  filterableBy?: EntityProjection[];

  /**
   * The collection of fields that may be used for server side sorting.
   */
  sortableBy?: Array<EntityProjection | ColumnName>;

  /**
   * Fields that contain qualitative information are dimensions.
   *
   * These are descriptive attributes, like a product category, customer address, or country. Dimensions can contain numeric characters
   * (like an alphanumeric customer ID), but are not numeric values (It wouldn’t make sense to add up all the ID numbers in a column, for
   * example).
   */
  dimensions?: Dimension[];

  /**
   * Measures are quantifications — fields like order subtotal, quantity of items purchased, or duration spent on a specific page.
   *
   * Measures are therefore computable. Say you have a measure, quantity of items purchased: you can do things like calculate the average
   * quantity ordered, sort by descending quantities, sum all quantities, and so on.
   */
  measures?: Measure[];
}

/**
 * Defines the shape of a column.
 */
export type ColumnDescriptor = ValueSchema & {
  /**
   * The name of the column.
   */
  name: ColumnName;
};

// export interface ItemDescriptor {
//   /**
//    * The JSON Schema data type for the values in the column.
//    */
//   type: ValueType;

//   /**
//    * The JSON Schema format name.
//    */
//   format?: string;
// }

/**
 * A dimension based on an entity projection.
 */
export interface ProjectionDimension {
  /**
   * The entity projection.
   */
  projection: EntityProjection;
}

/**
 * A description of a measure.
 */
export type Measure = ColumnDescriptor;

/**
 * A description of a dimension, either an entity projection or a column description.
 */
export type Dimension = ProjectionDimension | ColumnDescriptor;
