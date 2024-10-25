import SourceMap from "js-yaml-source-map";

import { Arrays, FileErrors, SchemaValidator, SourceMaps } from "../common";

import { ServiceSpecification } from "./specification";

/* eslint-disable import/no-namespace */
import * as specificationSchema from "../schemas/service-description.json";
/* eslint-enable import/no-namespace */

const schemaValidator = new SchemaValidator<ServiceSpecification>(specificationSchema, new SourceMaps());

let specLocation: string;
let serviceSourceMap: SourceMap;

export function loadService(path: string, result: FileErrors): ServiceSpecification {
  specLocation = path;
  const { model, errors, sourceMap } = schemaValidator.loadYaml(path);

  serviceSourceMap = sourceMap;
  if (errors) {
    result.withErrors(path, errors);
  }
  model.relationships = Arrays.orEmpty(model.relationships);
  return model;
}

export function getServicePath(): string {
  return specLocation;
}

export function getServiceSourceMap(): SourceMap {
  return serviceSourceMap;
}
