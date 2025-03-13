import { FileErrors } from "../../common";
import { SchemaRegistry } from "../../models";
import { ServiceSpecification } from "../../specification";
import { CodeGenerator } from "../base";
import { OpenAPISpecification } from "../openapi/types";
import { SchemaProcessor } from "./schema-processor";
import { generateSpecification, GraphQLSpecification, NodeInterface } from "./specification";
import { PageInfoType } from "./specification/page-info";

export class GraphQLGenerator implements CodeGenerator {
  async generate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _serviceSpecification: ServiceSpecification,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    schemaRegistry: SchemaRegistry,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _openApiSpecification: OpenAPISpecification,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    results: FileErrors,
  ): Promise<void> {
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Initialize the specification.
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const graphQL: GraphQLSpecification = {
      scalars: {},
      enums: {},
      interfaces: {
        Node: NodeInterface,
      },
      types: {
        PageInfo: PageInfoType,
      },
      connections: {},
    };

    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Convert the service specification into the GraphQL specification.
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Dump the contents.
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const contents = generateSpecification(graphQL);
    // eslint-disable-next-line no-console
    console.log(contents);
    throw new Error("Method not implemented.");
  }

  private processSchemas(specification: GraphQLSpecification, schemaRegistry: SchemaRegistry): void {
    const processor = new SchemaProcessor(specification);
    for (const [name, schema] of schemaRegistry.entries()) {
      specification.types[name] = processor.processEntitySchema(name, schema);
    }
  }
}
