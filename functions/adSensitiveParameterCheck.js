import { createRulesetFunction } from "@stoplight/spectral-core";

const DATA_CLASSIFICATION = "x-apres-data-classification";
const DATA_CLASSIFICATION_SENSITIVE = "sensitive";

export default createRulesetFunction(
  {
    input: null,
    options: null,
  },
  (operation) => {
    return (operation.parameters || [])
      .filter((parameter) => isSensitiveUrlParameter(parameter))
      .map((parameter) => {
        return {
          message: `Detected sensitive data in url parameter [${parameter.name}]`,
          // path: [...path, "parameters", index]
        };
      });
  },
);

function isSensitiveUrlParameter(parameter) {
  if (!["path", "query"].includes(parameter.in)) {
    return undefined;
  }

  if (isSensitive(parameter.schema)) {
    return true;
  }

  return false;
}

function isSensitive(schema) {
  if (schema) {
    if (schema[DATA_CLASSIFICATION] && schema[DATA_CLASSIFICATION] === DATA_CLASSIFICATION_SENSITIVE) {
      return true;
    }
  }

  return false;
}
