import { Cardinality, EntityName, RelationshipName, RelationshipType } from ".";

export type OwnershipTypes = "global" | "tenant" | "user";
export type Definitions = Record<string, AnySchema>;
export type Links = Record<string, Link>;
export interface EntitySchema extends ObjectSchema {
  ownership?: OwnershipTypes;
  singleton?: boolean;
  versioned?: boolean;
  links?: Links;
  /**
   * The alias for the entity name.  Renames all references to the entity with the given alias.
   */
  alias?: string;
  createable?: boolean;
  deleteable?: boolean;
  definitions?: Definitions;
  linkProperties?: Record<string, LinkProperty>;
}

export type ObjectSelector = ObjectSchema;

/**
 * References any valid sub-schema.
 */
export type AnySchema =
  /**
   * @if {"type" : "object"}
   * @then { $ref: "#/definitions/ObjectSchema"}
   */
  | ObjectSchema
  /**
   * @if {"type" : "array"}
   */
  | ArraySchema
  /**
   * @if {"type" : "string"}
   */
  | StringSchema
  /**
   * @if {"type" : "number"}
   */
  | NumberSchema
  /**
   * @if {"type" : "boolean"}
   */
  | BooleanSchema
  /**
   * @if {"type" : "null"}
   */
  | NullSchema
  | ReferenceSchema
  | RelationshipSchema;

export interface BaseSchema {
  /**
   * The `title` keyword must be a string. A "title" will preferably be short explanation about the purpose of the data described by the
   * schema.
   */
  title?: string;

  /**
   * The `description` keywords must be a string. A "description" will provide a more lengthy explanation about the purpose of the data
   * described by the schema.
   */
  description?: string;

  readOnly?: boolean;
  editable?: boolean;
}

export interface BaseSchemaWithExample<T> extends BaseSchema {
  default?: T;
  example?: T;
  examples?: Array<T>;
}

export type DataClassification = "sensitive" | "public";
export interface BaseScalarSchema<T> extends BaseSchemaWithExample<T> {
  /**
   *
   */
  "data-classification"?: DataClassification;
  enum?: Array<T>;
}

/**
 * Objects are the mapping type in JSON. They map "keys" to "values". In JSON, the "keys" must always be strings. Each of these pairs is
 * conventionally referred to as a "property".
 */
export interface ObjectSchema extends BaseSchemaWithExample<object> {
  type: "object";
  /**
   * The properties (key-value pairs) on an object are defined using the `properties` keyword. The value of `properties` is an object, where
   * each key is the name of a property and each value is a schema used to validate that property. Any property that doesn't match any of
   * the property names in the properties keyword is ignored by this keyword.
   */
  properties?: Record<string, AnySchema>;

  /**
   * By default, the properties defined by the `properties` keyword are not required. However, one can provide a list of required properties
   * using the `required` keyword.
   */
  required?: Array<string>;
}

/**
 * Arrays are used for ordered elements. In JSON, each element in an array may be of a different type.
 */
export interface ArraySchema extends BaseSchemaWithExample<Array<unknown>> {
  type: "array";

  /**
   * List validation is useful for arrays of arbitrary length where each item matches the same schema. For this kind of array, set the
   * `items` keyword to a single schema that will be used to validate all of the items in the array.
   */
  items: AnySchema;

  /**
   * The minimum length of the array can be specified using the `minItems` keywords. The value of each keyword must be a non-negative
   * number.
   */
  minItems?: number;

  /**
   * The maximum length of the array can be specified using the `maxItems` keywords. The value of each keyword must be a non-negative
   * number.
   */
  maxItems?: number;

  /**
   * A schema can ensure that each of the items in an array is unique. Simply set the uniqueItems keyword to true.
   */
  uniqueItems?: boolean;

  /**
   * The keyword allows to check that some properties in array items are unique.
   *
   * This keyword applies only to arrays. If the data is not an array, the validation succeeds.
   *
   * The value of this keyword must be an array of strings - property names that should have unique values across all items.
   */
  uniqueItemProperties?: Array<string>;
}

/**
 * The `string` type is used for strings of text. It may contain Unicode characters.
 */
export interface StringSchema extends BaseScalarSchema<string> {
  type: "string";
  /**
   * The format keyword allows for basic semantic identification of certain kinds of string values that are commonly used. For example,
   * because JSON doesn't have a "DateTime" type, dates need to be encoded as strings. format allows the schema author to indicate that the
   * string value should be interpreted as a date. By default, format is just an annotation and does not effect validation.
   */
  format?: string;
  /**
   * The length of a string can be constrained to a minimum length using the `minLength`. For both keywords, the value must be a
   * non-negative number.
   */
  minLength?: number;
  /**
   * The length of a string can be constrained to a maximum length using the `maxLength`. For both keywords, the value must be a
   * non-negative number.
   */
  maxLength?: number;
  /**
   * The pattern keyword is used to restrict a string to a particular regular expression. The regular expression syntax is the one defined
   * in JavaScript ([ECMA 262](https://www.ecma-international.org/publications-and-standards/standards/ecma-262/) specifically) with
   * Unicode support. See [Regular Expressions](https://json-schema.org/understanding-json-schema/reference/regular_expressions) for more
   * information.
   */
  pattern?: string;
}

/**
 * There are two numeric types: `integer` and `number`. They share the same validation keywords.
 *
 * The `integer` type is used for integral numbers. JSON does not have distinct types for integers and floating-point values. Therefore, the
 * presence or absence of a decimal point is not enough to distinguish between integers and non-integers. For example, 1 and 1.0 are two
 * ways to represent the same value in JSON. JSON Schema considers that value an integer no matter which representation was used.
 *
 * The `number` type is used for any numeric type, either integers or floating point numbers.
 */
export interface NumberSchema extends BaseScalarSchema<number> {
  type: "number" | "integer";

  /**
   * Numbers can be restricted to a minimum value, using the `minimum` keyword. It may be set to any non-negative number.
   *
   * minimum 0
   */
  minimum?: number;

  /**
   * Numbers can be restricted to a maximum value, using the `maximum` keyword. It may be set to any non-negative number.
   *
   * minimum 0
   */
  maximum?: number;

  /**
   * Numbers can be restricted to a multiple of a given number, using the `multipleOf` keyword. It may be set to any positive number.
   *
   * minimum 1
   */
  multipleOf?: number;
}

/**
 * The boolean type matches only two special values: `true` and `false`. Note that values that evaluate to true or false, such as 1 and 0,
 * are not accepted by the schema.
 */
export interface BooleanSchema extends BaseScalarSchema<boolean> {
  type: "boolean";
}

/**
 * When a schema specifies a `type` of `null`, it has only one acceptable value: `null`.
 */
export interface NullSchema extends BaseSchema {
  type: "null";
}

/**
 * Used to reference another schema
 */
export interface ReferenceSchema {
  $ref: string;
}

/**
 * The relationship schema is used to create a relationship between two entities.  Moreover, it is intended to embed the related entities
 * unique identifier as a named property in the current entities schema.
 *
 * The entity for which this relation is defined acts as the left-hand-side of the relationship.
 *
 * For example, in a chat application a chat-message may have to linked user's, the sending user and the recieving user.
 *
 * By default the relationship is a "..1" relationship; however, if the relationship is contained inside an array schema, then the
 * relationship is promoted to a "..*" relationship
 */
export interface RelationshipSchema extends BaseSchema {
  /**
   * The name of the entity that serves as the left-right-hand side of the relationship.
   */
  rel: EntityName;

  /**
   * By default all embeded relationships are from-many relationships.  The `fromOne` flag forces the relationship to act as a "1.."
   * relationship.
   */
  fromOne?: boolean;
  type?: RelationshipType;
  via?: RelationshipName;
  summary?: string;
  description?: string;
}

export interface Link {
  rel: EntityName;
  cardinality: Cardinality;
  type?: RelationshipType;
  via?: RelationshipName;
  summary?: string;
  description?: string;
}

export interface LinkProperty {
  rel: EntityName;
  cardinality: Cardinality;
  readOnly?: boolean;
  via?: RelationshipName;
  description?: string;
}
