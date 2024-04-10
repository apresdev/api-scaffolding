import { sanitizeOpenAPI } from "./generators/openapi/preprocess";
import { OpenAPISpecification } from "./generators/openapi/types";
import { loadYaml } from "./util";

export function loadTemplateOpenAPISpecification(): OpenAPISpecification {
  const contents = loadYaml("template.openapi.yaml") as OpenAPISpecification;
  sanitizeOpenAPI(contents);
  return contents;
}
