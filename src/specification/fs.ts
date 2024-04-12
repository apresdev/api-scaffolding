import SourceMap from "js-yaml-source-map";

import { FileErrors, SchemaValidator, SourceLocation, SourceMaps } from "../common";

import { ServiceSpecification } from "./specification";

import * as specificationSchema from "../schemas/service_description.json";

const schemaValidator = new SchemaValidator<ServiceSpecification>(specificationSchema, new SourceMaps());

// TODO: Get rid of global objects.
let specLocation: string;
let serviceSourceMap: SourceMap;

export function loadService(path: string, result: FileErrors): ServiceSpecification {
  specLocation = path;
  const { model, errors, sourceMap } = schemaValidator.loadYaml(path);

  serviceSourceMap = sourceMap;
  if (errors) {
    result.withErrors(path, errors);
  }
  model.relationships = model.relationships || [];
  return model;
}

export function serviceLocation(path: string): SourceLocation | undefined {
  return getServiceSourceMap().lookup(path.split("."));
}
export function getServicePath(): string {
  return specLocation;
}
export function getServiceSourceMap(): SourceMap {
  return serviceSourceMap;
}

export function specificationError(results: FileErrors, path: string, keyword: string, message: string) {
  const location = serviceLocation(path);
  results.withErrors(specLocation, [
    {
      line: location?.line || 0,
      column: location?.column || 0,
      keyword,
      severity: "error",
      message,
      path,
    },
  ]);
}
