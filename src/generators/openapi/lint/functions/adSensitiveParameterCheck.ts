import { createRulesetFunction } from "@stoplight/spectral-core";
import { OpenAPIV3 } from "openapi-types";

const DATA_CLASSIFICATION = "x-apres-data-classification";
const DATA_CLASSIFICATION_SENSITIVE = "sensitive";

export default createRulesetFunction(
  {
    input: null,
    options: null,
  },
  (operation: OpenAPIV3.OperationObject) => {
    return (operation.parameters || [])
      .map((parameter) => parameter as OpenAPIV3.ParameterObject)
      .filter((parameter) => isSensitiveUrlParameter(parameter))
      .map((parameter: OpenAPIV3.ParameterObject) => {
        return {
          message: `Detected sensitive data in url parameter [${parameter.name}]`,
          // path: [...path, "parameters", index]
        };
      });
  },
);

function isSensitiveUrlParameter(parameter: OpenAPIV3.ParameterObject) {
  if (!["path", "query"].includes(parameter.in)) {
    return undefined;
  }

  if (isSensitive(parameter.schema as OpenAPIV3.SchemaObject)) {
    return true;
  }

  return false;
}

function isSensitive(schema: OpenAPIV3.SchemaObject) {
  if (schema) {
    if (DATA_CLASSIFICATION in schema) {
      if (schema[DATA_CLASSIFICATION] && schema[DATA_CLASSIFICATION] === DATA_CLASSIFICATION_SENSITIVE) {
        return true;
      }
    }
  }

  return false;
}
