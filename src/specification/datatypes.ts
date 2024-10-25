import { DeepReadonly } from "../util";

export type JSONSchema = unknown;

export const DataVersion: DeepReadonly<JSONSchema> = {
  type: "number",
  description: "A data version identifier. Starts at 1, each subsequent mutation increments the version by 1.",
  minimum: 1,
};

export const EntityIdentifier: DeepReadonly<JSONSchema> = {
  type: "string",
  description: "A globally unique identifier for an entity in the system",
  format: "uuid",
};

export const APIError: DeepReadonly<JSONSchema> = {
  type: "object",
  description: "A standard error returned from an API Operation",
  properties: {
    message: {
      type: "string",
    },
    description: {
      type: "string",
    },
    errors: {
      type: "array",
      items: {
        $ref: "#/components/schemas/FieldError",
      },
    },
  },
};

export const FieldError: DeepReadonly<JSONSchema> = {
  type: "object",
  properties: {
    message: {
      type: "string",
    },
    description: {
      type: "string",
    },
    path: {
      type: "string",
    },
  },
};
