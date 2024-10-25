import { OpenAPIV3 } from "openapi-types";

import { BaseQuery } from "../../../specification";
import { DeepReadonly } from "../../../util";

export const Metadata: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/Metadata",
};

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Determines if a query operation is returning a list of resources or a single resource.
 *
 * @param query   The query operation.
 * @returns true if and only if the query includes a "findAll" operation.
 */
export function isListQuery(query: DeepReadonly<BaseQuery>): boolean {
  return "findAll" in query;
}

export function isRetrieveQuery(query: DeepReadonly<BaseQuery>): boolean {
  return "findOne" in query;
}

export function isSearchQuery(query: DeepReadonly<BaseQuery>): boolean {
  return "search" in query;
}

export function isNamedQuery(query: DeepReadonly<BaseQuery>): boolean {
  return "query" in query;
}
