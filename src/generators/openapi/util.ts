import { OpenAPIV3 } from "openapi-types";

import { OpenAPISpecification } from "./types";

import { Objects, toCamelCase, toKebabCase, toPascalCase, toTitleCase } from "../../common";

export const CONTENT_TYPE_JSON = "application/json";

export function arraySchema(items: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.SchemaObject {
  return {
    type: "array",
    items,
  };
}

export function entitySchemaReference(entity: string): OpenAPIV3.ReferenceObject {
  return {
    $ref: `#/components/schemas/${toPascalCase(entity)}`,
  };
}

export function openApiPath(path: string, openAPI: OpenAPISpecification): OpenAPIV3.PathItemObject {
  openAPI.paths[path] = Objects.orEmpty(openAPI.paths[path]);
  return openAPI.paths[path] as OpenAPIV3.PathItemObject;
}

export function pathIdentifier(entity: string): string {
  return `${toCamelCase(entity)}Id`;
}

export function pathIdentifierParameter(entity: string): OpenAPIV3.ParameterObject {
  return {
    name: pathIdentifier(entity),
    in: "path",
    required: true,
    schema: {
      $ref: `#/components/schemas/${toPascalCase(entity)}Identifier`,
    },
  };
}

export function toSummaryCase(entity: string | undefined): string {
  return toTitleCase(entity).toLowerCase();
}

export function toPathNounCase(entity: string | undefined): string {
  return toKebabCase(entity);
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (null === value || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...value];
  }

  return [value];
}

export function trimTrailingSlash(url: string): string {
  if (!url.endsWith("/")) {
    return url;
  }

  return trimTrailingSlash(url.slice(0, Math.max(0, url.length - 1)));
}
