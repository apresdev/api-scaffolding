import { OpenAPIV3 } from "openapi-types";

export const LimitParameter: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/parameters/LimitParameter",
};

export const OffsetParameter: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/parameters/OffsetParameter",
};

export const PaginationParameters = [LimitParameter, OffsetParameter];
