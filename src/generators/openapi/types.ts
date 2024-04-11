import { OpenAPIV3 } from "openapi-types";

export type OpenAPISpecification = OpenAPIV3.Document;

export type ContainerPath = string;
export type ContainerParams = Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject>;

export const Security: OpenAPIV3.SecurityRequirementObject = {
  oauth2: [],
};
