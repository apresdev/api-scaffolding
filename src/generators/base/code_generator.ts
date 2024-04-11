import { OpenAPISpecification } from "../openapi/types";

import { FileErrors } from "../../common";
import { SchemaRegistry } from "../../models";
import { ServiceSpecification } from "../../specification";
import { DeepReadonly } from "../../util";

export interface CodeGenerator {
  generate(
    serviceSpecification: DeepReadonly<ServiceSpecification>,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
  ): void | Promise<void>;
}
