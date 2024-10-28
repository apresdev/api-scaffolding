import { OpenAPIV3 } from "openapi-types";

export const DataVersion: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/DataVersion",
};

export const CommitMessage: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/CommitMessage",
};

export const StringSchema: OpenAPIV3.SchemaObject = {
  type: "string",
};

export const NumberSchema: OpenAPIV3.SchemaObject = {
  type: "number",
};

export const PercentileSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    "1.0": NumberSchema,
    "5.0": NumberSchema,
    "25.0": NumberSchema,
    "50.0": NumberSchema,
    "75.0": NumberSchema,
    "95.0": NumberSchema,
    "99.0": NumberSchema,
  },
};
