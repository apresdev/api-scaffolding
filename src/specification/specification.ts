import { Predicates } from "../common";

import { Policies } from "./policies";

import { IncludeDirective } from ".";
import { FileTypeName } from "./file";
import { NamedQuery } from "./named-query";

export type EntityName = string;
export type RelationshipName = string;
export type ViaEntry = EntityName | RelationshipName;
export type Via = ViaEntry | ViaEntry[];
// export type Projection = Record<EntityName, Array<FieldName>>;

/**
 * An Apres API Specification version.
 *
 * @pattern \d+.\d+.\d+
 * @default 1.0.0
 */
export type ApresApiSpecificationVersion = string;

/**
 * An Apres Service Specification.
 */
export type ServiceSpecification = ServiceSpecificationVersion1;

/**
 * The base interface for all Apres API Specifications.
 */
export interface BaseServiceSpecification {
  /**
   * The Apres API specification version.
   */
  apresApi: ApresApiSpecificationVersion;
}

/**
 * The specification for the service.  Defines all of the entities and entity relationships in the service.  Defines all query and mutation
 * operations provided by the service.
 */
export interface ServiceSpecificationVersion1 extends BaseServiceSpecification {
  /**
   * The Apres API specification version.
   */
  apresApi: "1.0.0";

  /**
   * The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be presented in editing or
   * documentation generation tools for convenience.
   */
  info: Information;

  /**
   * An optional collection of file type names.
   */
  files?: FileTypeName[];

  /**
   * The collection of entities managed by the service.
   */
  entities: EntityName[];

  /**
   * The entity relationships defined by the service.
   */
  relationships?: Relationships;

  /**
   * The mutation and query operations provided by the service.
   */
  operations: Operations;

  /**
   * The collection of policies for the service.
   */
  policies?: Policies;
}

/**
 * The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be presented in editing or
 * documentation generation tools for convenience.
 */
export interface Information {
  /**
   * The title of the API.
   */
  title: string;
  /**
   * The version of the OpenAPI document (which is distinct from the OpenAPI Specification version or the API implementation version).
   */
  version: string;
  /**
   * The base URL for the service.
   */
  baseUrl: string;
  /**
   * A short description of the API. CommonMark syntax MAY be used for rich text representation.
   */
  description: string;
  /**
   * The contact information for the exposed API.
   */
  contact: ContactInformation;
}

/**
 * Contact information for the exposed API.
 */
export interface ContactInformation {
  /**
   * The identifying name of the contact person/organization
   */
  name?: string;
  /**
   * The URL pointing to the contact information. MUST be in the format of a URL.
   */
  url?: URL;
  /**
   * The email address of the contact person/organization. MUST be in the format of an email address.
   *
   * @format  email
   */
  email: string;
}

export type Relationships = Relationship[];

/**
 * Defines a relationship between two entities.
 *
 * In GraphQL, this would represent an egde connection between two GraphQL nodes.
 */
export interface Relationship {
  /**
   * The relationship type, e.g. composition vs aggregation vs association.
   */
  type: RelationshipType;

  /**
   * The cardinality of the relation expressed in terms of left-to-right
   */
  cardinality: Cardinality;

  /**
   * The left node in the relationship.
   *
   * In composition relationships, this represents the parent entity.
   */
  left: EntityName;

  /**
   * The right node in the relationship.
   *
   * In composition relationships, this represents the child entity.
   */
  right: string;

  /**
   * The name of the relationship.
   *
   * This is auto-generated if not defined.  The auto-generated name depends on the cardinality.  If the cardinality to "to-many" then the
   * relation name is the pluralized form of the right entity, otherwise it is simply the right entity.
   */
  name?: string;

  /**
   * A summarization of the relationship name.
   *
   * For example, a physician "practices at" a facility.
   */
  summary?: string;

  /**
   * A long text description of the relationship.
   */
  description?: string;

  /**
   * Flag to indicate that the relationship is embedded in the entity.
   *
   * If using "byId", then the relationship is denormalized by using the related entity identifiers. So an array of ids for a "to-many"
   * relationship, or an identifier for a "to-one" relationship.
   *
   * If using "embed", then the relationhisp is denormalized by embedding the entity schema into the left schema. So an array of objects
   * for a "to-many" relationship, or an object for a "to-one" relationship.
   */
  denormalize?: "byId" | "byEntity";

  /**
   * This is used to indicate that the relationship is a transitive relation ship based on an intermediate relationship or sets of relationships.
   *
   * For example, a region has a collection of territories, a territory has a collection of physicians, therefore a region can have a
   * collection of physicians by applying a flatMap on all child territory physicians.  This is mostly to provide context in the diagrams.
   */
  via?: Via;
}

export enum RelationshipType {
  ASSOCIATION = "association",
  COMPOSITION = "composition",
  AGGREGATION = "aggregation",
}

export enum Cardinality {
  MANY_TO_MANY = "*..*",
  MANY_TO_ONE = "*..1",
  ONE_TO_MANY = "1..*",
  ONE_TO_ONE = "1..1",
}

/**
 * The mutation and query operations provided by the service.
 */
export interface Operations {
  /**
   * A declaration of all mutations provided by the service.
   */
  mutations: Mutations;

  /**
   * A collection of projection fragments. Used when multiple APIs return similar data.
   */
  fragments?: Fragments;

  /**
   * A declaration of all queries provided by the service.
   */
  queries: Queries;
}

/**
 * A collection of Mutation objects.
 */
export type Mutations = Mutation[];

/**
 * Defines a mutable entity in the service.
 */
export type Mutation = EntityMutation | FileMutation;

/**
 * Defines a mutable entity in the service.
 */
export interface EntityMutation {
  /**
   * The name of the entity to mutate.
   */
  entity: EntityName;

  /**
   * The optional operation tag.
   */
  tag?: string;
}

/**
 * Defines a mutable entity in the service.
 */
export interface FileMutation {
  /**
   * The name of the file to mutate.
   */
  file: FileTypeName;

  /**
   * The optional operation tag.
   */
  tag?: string;
}

export function isFileMutation(mutation: Mutation): boolean {
  return "file" in mutation;
}

export function isEntityMutation(mutation: Mutation): boolean {
  return "entity" in mutation;
}

export type Queries = Query[];
export type Query = ListQuery | RetrieveQuery | SearchQuery | NamedQuery | IncludeDirective;
export type JoinDirective = ViaEntry | EntityProjection;
export type Join = JoinDirective[];
export type FragmentName = string;

export interface Fragment {
  name: FragmentName;
  on: EntityProjection;
}
export type Fragments = Array<Fragment | IncludeDirective>;

export interface BaseQuery {
  /**
   * The name of the query.
   */
  name?: string;

  /**
   * A short summary of what the query does.
   */
  summary?: string;

  /**
   * A verbose explanation of the query behavior. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string;

  /**
   * The optional operation tag.
   */
  tag?: string;

  /**
   * The collection of fields that may be used for server side filtering.
   *
   * Note, this affects
   */
  filterableBy?: EntityProjection[];

  /**
   * The collection of fields that may be used for server side sorting.
   */
  sortableBy?: EntityProjection[];
}

export interface FindQuery extends BaseQuery {
  /**
   * The option entity or entities to filter the query by.
   * Currently assumes that the entity and entity identifier are included in the path of the query.
   *
   * Note, this affects path parameters in the operation URL.
   */
  given?: EntityName | EntityName[];

  /**
   * The collection of entity or entities to join in the result set.
   * Currently assumes these are relationships to the source entity of the query.
   */
  join?: Join;

  /**
   * An optional suffix to include with the find operation.  This is useful when two or more queries attempt to find the entities but will
   * include either filterableBy request parameters or different entity projections in the reponse.
   *
   * This will affect both the operationId by appending the withSuffix in PascalCase and the operation path by appending the withSuffix as
   * /kebab-case.
   */
  withSuffix?: string;
}

/**
 * The entity or entities to find in a query.
 * Currently assumes that the last entity in the list is the "source entity" for a query.
 */
export type FindType = JoinDirective; // | Array<JoinDirective>;

/**
 * A query operation that is expected to return a list of source entities.
 */
export interface ListQuery extends FindQuery {
  /**
   * The collection of entities to list.
   */
  findAll: FindType;
}

/**
 * A query operation that is expected to return a single source entity.
 */
export interface RetrieveQuery extends FindQuery {
  /**
   * The entity to find.
   */
  findOne: FindType;
}

/**
 * A query that is expected to execute a search against a specific entity.
 */
export interface SearchQuery extends BaseQuery {
  /**
   * The searchable entity.
   */
  search: EntityName | EntityProjection;

  /**
   * The collection of fields that may be used for server side filtering.
   *
   * Note, this affects
   */
  filterableBy?: EntityProjection[];
}

/**
 * A projection clause that lists which entity fields to include in the result set.
 *
 * @minProperties 1
 * @maxProperties 1
 */
export type EntityProjection = Record<ViaEntry, JoinDirective[]>;

const isProjectedColumn = Predicates.not(Predicates.eachArrayItem(Predicates.or(Predicates.isString(), isEntityProjection)));

/**
 * Determines if a value is an entity project.
 *
 * @param value The entity project or aggregation to check.
 * @returns true if and only if the the value is an object where every property is an array of strings.
 */
export function isEntityProjection(value: GroupBy): boolean {
  if (typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const exceptions = Object.keys(value as Record<string, unknown>).filter((key: string) => isProjectedColumn(record[key] as never));

  return exceptions.length === 0;
}

export function isViaEntry(value: GroupBy): boolean {
  return typeof value === "string";
}

export function isProjectection(value: GroupBy): boolean {
  return isViaEntry(value) || isEntityProjection(value);
}

export function isDistinctProjection(value: GroupBy): boolean {
  if (typeof value !== "object") {
    return false;
  }

  const keys = Object.keys(value);
  const values = Object.values(value);
  if (keys.length !== 1) {
    return false;
  }

  return keys[0] === "distinct" && isProjectection(values[0]);
}

export function isGroupBy(value: GroupBy): boolean {
  return isProjectection(value) || isDistinctProjection(value);
}

export interface DistinctProjection {
  distinct: Projection;
}

export type Projection = ViaEntry | EntityProjection;
export type GroupBy = DistinctProjection | Projection;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Cardinality {
  export function reverse(cardinality: Cardinality): Cardinality {
    switch (cardinality) {
      case Cardinality.MANY_TO_MANY:
      case Cardinality.ONE_TO_ONE: {
        return cardinality;
      }
      case Cardinality.ONE_TO_MANY: {
        return Cardinality.MANY_TO_ONE;
      }
      case Cardinality.MANY_TO_ONE: {
        return Cardinality.ONE_TO_MANY;
      }
    }
  }

  export function isToMany(cardinality: Cardinality): boolean {
    switch (cardinality) {
      case Cardinality.MANY_TO_MANY:
      case Cardinality.ONE_TO_MANY: {
        return true;
      }
      case Cardinality.ONE_TO_ONE:
      case Cardinality.MANY_TO_ONE: {
        return false;
      }
    }
  }

  export function isFromMany(cardinality: Cardinality): boolean {
    switch (cardinality) {
      case Cardinality.MANY_TO_MANY:
      case Cardinality.MANY_TO_ONE: {
        return true;
      }
      case Cardinality.ONE_TO_MANY:
      case Cardinality.ONE_TO_ONE: {
        return false;
      }
    }
  }

  export function isToOne(cardinality: Cardinality): boolean {
    return !isToMany(cardinality);
  }

  export function isFromOne(cardinality: Cardinality): boolean {
    return !isFromMany(cardinality);
  }
}
