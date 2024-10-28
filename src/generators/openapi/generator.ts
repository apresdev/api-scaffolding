import { CodeGenerator } from "../base";

import { renderMutations } from "./mutation-generator";
import { QueriesProcessor } from "./queries";
import { OpenAPISpecification } from "./types";
import { CONTENT_TYPE_JSON, trimTrailingSlash } from "./util";

import { OpenAPIV3 } from "openapi-types";
import { Arrays, FileErrors, Objects } from "../../common";
import { asSchemaObject } from "../../entities/entities";
import { SchemaRegistry, enforcePropertyCase } from "../../models";
import {
  EntitySchema,
  Fragments,
  Queries,
  ServiceSpecification,
  buildGraph,
  getServicePath,
  getServiceSourceMap,
} from "../../specification";
import { dumpJson, dumpYaml, sortKeys } from "../../util";
import { FragmentsProcessor } from "./fragment-processor";
import { lintSpecification } from "./lint";
import { References } from "./references";
import ResponseObject = OpenAPIV3.ResponseObject;

export class OpenAPIGenerator implements CodeGenerator {
  private readonly basePath: string;
  private readonly outfile: string;
  constructor(basePath: string, outfile: string) {
    this.basePath = basePath;
    this.outfile = outfile;
  }
  public async generate(
    serviceSpecification: ServiceSpecification,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
    asYaml: boolean = false,
  ) {
    this.generateInfo(serviceSpecification, openAPISpecification);
    this.generateOperations(serviceSpecification, schemaRegistry, openAPISpecification, results);
    this.generateSchemas(schemaRegistry, openAPISpecification);
    await this.postProcess(openAPISpecification);
    this.writeSpecification(openAPISpecification, asYaml);
  }

  private generateInfo(serviceSpecification: ServiceSpecification, openAPISpecification: OpenAPISpecification) {
    openAPISpecification.info = {
      title: serviceSpecification.info.title,
      version: serviceSpecification.info.version,
      description: serviceSpecification.info.description,
      contact: {
        name: serviceSpecification.info.contact.name,
        url: (serviceSpecification as ServiceSpecification).info.contact?.url?.toString(),
        email: serviceSpecification.info.contact.email,
      },
    };

    openAPISpecification.servers = [
      {
        url: trimTrailingSlash(serviceSpecification.info.baseUrl),
        description: "The production URL.",
        variables: {},
      },
    ];
  }
  /**
   * Renders all operations in the OpenAPI specification.
   *
   * @param serviceSpecification The service specification.
   * @param schemaRegistry The schema registry.
   * @param openAPISpecification The OpenAPI specification.
   * @param results The collector of file processing errors.
   */
  private generateOperations(
    serviceSpecification: ServiceSpecification,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
  ) {
    // Build the dependency graph.
    const graph = buildGraph(serviceSpecification, schemaRegistry);

    if (serviceSpecification.operations.fragments) {
      const fragmentProcessor = new FragmentsProcessor(results);
      fragmentProcessor.processModel(serviceSpecification.operations.fragments as Fragments, {
        path: getServicePath(),
        sourceMap: getServiceSourceMap(),
        schemaRegistry,
        openAPI: openAPISpecification,
        graph,
        jsonPath: "operations.fragments",
        specification: serviceSpecification as ServiceSpecification,
      });
    }

    const queriesProcessor = new QueriesProcessor(results);
    queriesProcessor.processModel(serviceSpecification.operations.queries as Queries, {
      path: getServicePath(),
      sourceMap: getServiceSourceMap(),
      schemaRegistry,
      openAPI: openAPISpecification,
      graph,
      jsonPath: "operations.queries",
      specification: serviceSpecification as ServiceSpecification,
    });

    // Append all mutation operations.
    for (const mutation of serviceSpecification.operations.mutations) {
      renderMutations(mutation, openAPISpecification, graph, schemaRegistry);
    }
  }

  private generateSchemas(schemaRegistry: SchemaRegistry, openAPISpecification: OpenAPISpecification) {
    for (const [name, schema] of schemaRegistry.entries()) {
      const result = asSchemaObject(schema);

      enforcePropertyCase(result as EntitySchema);

      openAPISpecification.components = Objects.orEmpty(openAPISpecification.components);
      openAPISpecification.components.schemas = Objects.orEmpty(openAPISpecification.components.schemas);
      openAPISpecification.components.schemas[name] = result;
    }
  }

  private writeSpecification(openAPISpecification: OpenAPISpecification, asYaml: boolean) {
    // Order tags by name alphabetically
    openAPISpecification.tags = Arrays.orEmpty(openAPISpecification.tags).sort((a, b) => a.name.localeCompare(b.name));

    // Order paths by path URL alphabetically
    openAPISpecification.paths = sortKeys(openAPISpecification.paths);

    if (asYaml) {
      dumpYaml(openAPISpecification, this.outfile);
    } else {
      dumpJson(openAPISpecification, this.outfile);
    }
  }

  private hasNamedQuery(openapi: OpenAPISpecification): boolean {
    const xqr = openapi.components?.responses?.ExecuteQueryResponse as ResponseObject;
    if (!xqr || !xqr.content) {
      return false;
    }
    const examples = xqr.content[CONTENT_TYPE_JSON]?.examples as object;
    if (!examples) {
      return false;
    }
    return Object.keys(examples).length > 0;
  }

  /**
   * This removes the query endpoint if there are no named queries in the specification.
   *
   * @param openapi The OpenAPI specification.
   * @private
   */
  private removeUnusedQueryEndpoint(openapi: OpenAPISpecification): void {
    if (!this.hasNamedQuery(openapi)) {
      delete openapi.paths["/queries/{queryId}"];
    }
  }

  /**
   * Removes all operations that are not used in the specification.
   *
   * @param openapi The OpenAPI specification.
   * @private
   */
  private removeUnusedOperations(openapi: OpenAPISpecification): void {
    this.removeUnusedQueryEndpoint(openapi);
  }

  /**
   * Removes all tags that are not used in the specification.
   *
   * @param openapi The OpenAPI specification.
   * @private
   */
  private removeUnusedTags(openapi: OpenAPISpecification): void {
    interface StringToBoolMap {
      [key: string]: boolean;
    }
    const allReferencedTags: StringToBoolMap = {};
    for (const path in openapi.paths) {
      const pathItem = openapi.paths[path];
      for (const m in pathItem) {
        const method = m as OpenAPIV3.HttpMethods;
        const operation = pathItem[method];

        if (!operation) {
          continue;
        }

        if ("tags" in operation)
          for (const tag of Arrays.orEmpty(operation.tags)) {
            allReferencedTags[tag] = true;
          }
      }
    }
    openapi.tags = openapi.tags?.filter((tag) => allReferencedTags[tag.name]);
  }

  /**
   * Runs post-processing methods to clean up the generated schema.  For example, removing all unreferenced components.
   *
   * @param openapi The OpenAPI specification.
   */
  private async postProcess(openapi: OpenAPISpecification): Promise<boolean> {
    this.removeUnusedOperations(openapi);
    this.removeUnusedTags(openapi);
    do {
      // Keep tree shaking unused components until no unused components are found.
      // Note, we need to keep doing this in a loop because there could be components that are only referenced by other components that do
      // not have a reference, as such each successive tree shake could reveal more unused components.  This is guaranteed to eventually
      // terminate (since list of components must be reduced on a true result).
    } while (this.treeShakeUnusedComponents(openapi));

    // Lint the specification to ensure we generated a valid spec.
    return await lintSpecification(openapi, this.outfile);
  }

  /**
   * Finds and removes all components that do not have at least one $ref reference in the API specification.
   *
   * Returns true if at least one component was removed.
   *
   * @param openapi The OpenAPI specification.
   *
   * @returns true if and only if at least one unused component was found.
   */
  private treeShakeUnusedComponents(openapi: OpenAPISpecification): boolean {
    const prunedReferences: string[] = [];
    if (!openapi.components) {
      return false;
    }

    const references = new References();
    references.analyze(openapi);

    for (const type of componentTypeNames) {
      const components = Objects.orEmpty(openapi.components);
      const value: Record<string, unknown> = components[type as ComponentTypeName] as Record<string, unknown>;
      if (typeof value !== "object") {
        continue;
      }

      const componentsType: Record<string, unknown> = components[type] as Record<string, unknown>;
      for (const name of Object.keys(componentsType)) {
        const reference = `#/components/${type}/${name}`;

        if (references.has(reference)) {
          continue;
        }

        delete componentsType[name];

        prunedReferences.push(reference);
      }
    }

    return prunedReferences.length > 0;
  }
}

const componentTypeNames = ["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "links", "callbacks"] as const;
type ComponentTypeName = (typeof componentTypeNames)[number];
