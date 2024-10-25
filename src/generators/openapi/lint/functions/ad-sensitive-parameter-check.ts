import { createRulesetFunction } from "@stoplight/spectral-core";
import { OpenAPIV3 } from "openapi-types";
import { Arrays } from "../../../../common";

const DATA_CLASSIFICATION = "x-apres-data-classification";
const DATA_CLASSIFICATION_SENSITIVE = "sensitive";

export default createRulesetFunction(
  /* eslint-disable unicorn/no-null */
  {
    input: null,
    options: null,
  },
  /* eslint-enable unicorn/no-null */
  (operation: OpenAPIV3.OperationObject) => {
    return Arrays.orEmpty(operation.parameters)
      .map((parameter) => parameter as OpenAPIV3.ParameterObject)
      .filter((parameter) => isSensitiveUrlParameter(parameter))
      .map((parameter: OpenAPIV3.ParameterObject) => {
        return {
          message: `Detected sensitive data in url parameter [${parameter.name}]`,
        };
      });
  },
);

function isSensitiveUrlParameter(parameter: OpenAPIV3.ParameterObject) {
  if (!["path", "query"].includes(parameter.in)) {
    return;
  }

  return isSensitive(parameter.schema as OpenAPIV3.SchemaObject);
}

function isSensitive(schema: OpenAPIV3.SchemaObject) {
  return (
    schema && DATA_CLASSIFICATION in schema && schema[DATA_CLASSIFICATION] && schema[DATA_CLASSIFICATION] === DATA_CLASSIFICATION_SENSITIVE
  );
}
