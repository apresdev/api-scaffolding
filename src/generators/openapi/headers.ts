import { OpenAPIV3 } from "openapi-types";

import { CommitMessage, DataVersion } from "./data_types";

export const IfMatchHeader: OpenAPIV3.ParameterObject = {
  name: "If-Match",
  in: "header",
  required: true,
  schema: DataVersion,
};

export const CommitMessageHeader: OpenAPIV3.ParameterObject = {
  name: "X-Commit-Message",
  in: "header",
  required: true,
  schema: CommitMessage,
};
