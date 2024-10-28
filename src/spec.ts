import { sanitizeOpenAPI } from "./generators/openapi/preprocess";
import { OpenAPISpecification } from "./generators/openapi/types";

/* eslint-disable import/no-namespace */
import * as template from "./generators/openapi/template.openapi.json";
/* eslint-enable import/no-namespace */

import { deepCopy } from "./util";

export function loadTemplateOpenAPISpecification(): OpenAPISpecification {
  const contents = deepCopy(template) as OpenAPISpecification;
  if ("default" in contents) {
    delete contents.default;
  }
  sanitizeOpenAPI(contents);
  return contents;
}
