import { OpenAPISpecification } from "./types";

/**
 * Ensures that all expected OpenAPI sections are pre-defined.
 *
 * @param openAPI The OpenAPI specification.
 */
export function sanitizeOpenAPI(openAPI: OpenAPISpecification) {
  openAPI.paths = openAPI.paths || {};
  openAPI.components = openAPI.components || {};
  openAPI.components.parameters = openAPI.components.parameters || {};
  openAPI.components.requestBodies = openAPI.components.requestBodies || {};
  openAPI.components.responses = openAPI.components.responses || {};
}
