import { OpenAPIV3 } from "openapi-types";

import { ContainerParams, OpenAPISpecification } from "./types";

import { toCamelCase, toKebabCase, toPascalCase, toTitleCase } from "../../common";
import { EntitySchema } from "../../specification";

export const CONTENT_TYPE_JSON = "application/json";

export function pathParameterName(param: string): string {
  return `${toPascalCase(param)}IdParameter`;
}

export function generateParameterRef(param: string) {
  return {
    $ref: `#/components/parameters/${param}`,
  };
}

export function toParameters(params: ContainerParams): Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> {
  return params;
  // params.map((param) => generateParameterRef(pathParameterName(param)));
}

export function arraySchema(items: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.SchemaObject {
  return {
    type: "array",
    items,
  };
}

export function entitySchemaRef(entity: string): OpenAPIV3.ReferenceObject {
  return {
    $ref: `#/components/schemas/${toPascalCase(entity)}`,
  };
}

export function openApiPath(path: string, openAPI: OpenAPISpecification): OpenAPIV3.PathItemObject {
  openAPI.paths[path] = openAPI.paths[path] || {};
  return openAPI.paths[path] as OpenAPIV3.PathItemObject;
}

export function requestBody(schema: EntitySchema) {
  return {
    required: true,
    description: "TODO: fill this out.",
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

export function successResponse(description: string, schema: EntitySchema, metadata?: EntitySchema | unknown) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            metadata,
            data: schema,
          },
        },
      },
    },
  };
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
    } as OpenAPIV3.SchemaObject, // TODO: You are supposed to be allowed $ref on parameter schemas
  };
}

// export function buildAncestralPath(ancestry: Ancestry): ContainerPath {
//   return ancestry
//     .map((ancestor) => {
//       if (ancestor.isCollection) {
//         return `/${toPathNounCase(pluralize(ancestor.name))}/{${toPathParameterCase(ancestor.name)}Id}`;
//       }

//       return `/${toPathNounCase(ancestor.name)}`;
//     })
//     .join("");
// }

// export function buildAncestralParams(ancestry: Ancestry): ContainerParams {
//   return ancestry.filter((ancestor) => ancestor.isCollection).map((ancestor) => pathIdentifierParameter(ancestor.name));
// }

export function toSummaryCase(entity: string | undefined): string {
  return toTitleCase(entity).toLowerCase();
}

export function toPathNounCase(entity: string | undefined): string {
  return toKebabCase(entity);
}

export function toPathParameterCase(entity: string | undefined): string {
  return toCamelCase(entity);
}

export function asArray<T>(value: T | Array<T> | undefined): Array<T> {
  if (null === value || typeof value === "undefined") {
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

  return trimTrailingSlash(url.substring(0, url.length - 1));
}
