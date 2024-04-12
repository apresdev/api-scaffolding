import { sanitizeOpenAPI } from "./generators/openapi/preprocess";
import { OpenAPISpecification } from "./generators/openapi/types";

import * as template from "./generators/openapi/template.openapi.json";

export function loadTemplateOpenAPISpecification(): OpenAPISpecification {
  const contents = Object.assign({}, template) as OpenAPISpecification;
  if ("default" in contents) {
    delete contents.default;
  }
  sanitizeOpenAPI(contents);
  return contents;
}
