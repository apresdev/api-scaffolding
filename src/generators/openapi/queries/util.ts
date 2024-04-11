import { OpenAPIV3 } from "openapi-types";

import { Query } from "../../../specification";
import { DeepReadonly } from "../../../util";

export const Metadata: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/Metadata",
};

export const Search: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/Search",
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
export function isListQuery(query: DeepReadonly<Query>): boolean {
  return "findAll" in query;
}

export function isRetrieveQuery(query: DeepReadonly<Query>): boolean {
  return "findOne" in query;
}

export function isSearchQuery(query: DeepReadonly<Query>): boolean {
  return "search" in query;
}

export function isSelectQuery(query: DeepReadonly<Query>): boolean {
  return "select" in query;
}

export function forEachItem<T, K extends keyof T, V>(obj: T, key: K, path: string, handler: (item: V, path: string) => void) {
  if (!obj) {
    return;
  }

  const value: T[K] = obj[key];
  if (!value) {
    return;
  }

  const itemsPath = [...(path.length > 0 ? path.split(".") : []), key];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemPath = [...itemsPath, String(index)].join(".");
      handler(item as V, itemPath);
    });
    return;
  }

  handler(value as V, itemsPath.join("."));
}
