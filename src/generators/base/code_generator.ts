import { OpenAPISpecification } from "../openapi/types";

import { FileErrors } from "../../common";
import { SchemaRegistry } from "../../models";
import { ServiceSpecification } from "../../specification";

export interface CodeGenerator {
  generate(
    serviceSpecification: ServiceSpecification,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
  ): void | Promise<void>;
}
