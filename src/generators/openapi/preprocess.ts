import { Objects } from "../../common";
import { OpenAPISpecification } from "./types";

/**
 * Ensures that all expected OpenAPI sections are pre-defined.
 *
 * @param openAPI The OpenAPI specification.
 */
export function sanitizeOpenAPI(openAPI: OpenAPISpecification) {
  openAPI.paths = Objects.orEmpty(openAPI.paths);
  openAPI.components = Objects.orEmpty(openAPI.components);
  openAPI.components.parameters = Objects.orEmpty(openAPI.components.parameters);
  openAPI.components.requestBodies = Objects.orEmpty(openAPI.components.requestBodies);
  openAPI.components.responses = Objects.orEmpty(openAPI.components.responses);
}
