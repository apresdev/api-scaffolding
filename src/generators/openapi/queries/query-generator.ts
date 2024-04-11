import { OpenAPISpecification } from "../types";

import { SchemaRegistry } from "../../../models";
import { DependencyGraph, Query, ServiceSpecification } from "../../../specification";

/**
 * The query processing execution context.
 */
export interface QueryProcessorContext {
  /**
   * The current JSON path of the query being processed.
   */
  jsonPath?: string;
  /**
   * The registry of known schemas.
   */
  schemaRegistry: SchemaRegistry;
  /**
   * The OpenAPI specification.
   */
  openAPI: OpenAPISpecification;
  /**
   * The dependency graph of known nodes and edges.
   */
  graph: DependencyGraph;
  /**
   * The service specification.
   */
  specification: ServiceSpecification;
}

/**
 * The base interface for a query generator.
 */

export interface QueryGenerator<T extends Query> {
  /**
   * Renders a Query as an OpenAPI operation.
   *
   * @param query   The user supplied query to be rendered as an OpenAPI operation.
   * @param context The execution context.
   */
  render(query: T, context: QueryProcessorContext): void;
}
