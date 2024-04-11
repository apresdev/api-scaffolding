import _ = require("underscore");

import { CodeGenerator } from "../base";

import { renderMutations } from "./mutation-generator";
import { QueriesProcessor } from "./queries";
import { OpenAPISpecification } from "./types";
import { trimTrailingSlash } from "./util";

import { FileErrors } from "../../common";
import { asSchemaObject } from "../../entities/entities";
import { SchemaRegistry, enforcePropertyCase } from "../../models";
import {
  EntitySchema,
  Mutation,
  Queries,
  ServiceSpecification,
  buildGraph,
  getServicePath,
  getServiceSourceMap,
} from "../../specification";
import { DeepReadonly, dumpJson } from "../../util";
import { lintSpecification } from "./lint";

export class OpenAPIGenerator implements CodeGenerator {
  private readonly basePath: string;
  private readonly outfile: string;
  constructor(basePath: string, outfile: string) {
    this.basePath = basePath;
    this.outfile = outfile;
  }
  public async generate(
    serviceSpecification: DeepReadonly<ServiceSpecification>,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
  ) {
    this.generateinfo(serviceSpecification, openAPISpecification);
    this.generateOperations(serviceSpecification, schemaRegistry, openAPISpecification, results);
    this.generateSchemas(schemaRegistry, openAPISpecification);
    await this.postProcess(openAPISpecification);
    this.writeSpecification(openAPISpecification);
  }

  private generateinfo(serviceSpecification: DeepReadonly<ServiceSpecification>, openAPISpecification: OpenAPISpecification) {
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
   */
  private generateOperations(
    serviceSpecification: DeepReadonly<ServiceSpecification>,
    schemaRegistry: SchemaRegistry,
    openAPISpecification: OpenAPISpecification,
    results: FileErrors,
  ) {
    // Build the dependency graph.
    const graph = buildGraph(serviceSpecification, schemaRegistry);

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
    serviceSpecification.operations.mutations.forEach((mutation: Mutation): void => {
      renderMutations(mutation, openAPISpecification, graph, schemaRegistry);

      // if (isVersioned(schema)) {
      //   appendRevisionHistoryOperations(name, serviceSpecification, openAPISpecification, graph);
      // }
    });
  }

  private generateSchemas(schemaRegistry: SchemaRegistry, openAPISpecification: OpenAPISpecification) {
    schemaRegistry.forEach((schema: EntitySchema, name: string) => {
      const result = asSchemaObject(schema);

      // TODO: Figure out proper typing here if and when we change our EntityModel type.
      enforcePropertyCase(result as EntitySchema);

      openAPISpecification.components = openAPISpecification.components || {};
      openAPISpecification.components.schemas = openAPISpecification.components.schemas || {};
      openAPISpecification.components.schemas[name] = result;
    });
  }

  private writeSpecification(openAPISpecification: OpenAPISpecification) {
    dumpJson(openAPISpecification, this.outfile);
  }

  /**
   * Runs post-processing methods to cleanup the generated schema.  For example, removing all unreferenced components.
   *
   * @param openapi The OpenAPI specification.
   */
  private async postProcess(openapi: OpenAPISpecification): Promise<boolean> {
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
    const prunedReferences: Array<string> = [];
    if (!openapi.components) {
      return false;
    }

    const references = new Set<string>();
    findAllReferences(openapi, references);

    componentTypeNames.forEach((type: ComponentTypeName) => {
      const components = openapi.components || {};
      const value: Record<string, unknown> = components[type as ComponentTypeName] as Record<string, unknown>;
      if (typeof value !== "object") {
        return;
      }

      const componentsType: Record<string, unknown> = components[type] as Record<string, unknown>;
      Object.keys(componentsType).forEach((name: string) => {
        const reference = `#/components/${type}/${name}`;

        if (references.has(reference)) {
          return;
        }

        // console.log("Pruning unused component: " + reference);
        delete componentsType[name];

        prunedReferences.push(reference);
      });
    });

    return prunedReferences.length > 0;
  }
}

function findAllReferences<T>(value: T, references: Set<string>) {
  if (!value) {
    return;
  }

  if (typeof value !== "object" && !Array.isArray(value)) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((subValue) => findAllReferences(subValue, references));
    return;
  }

  if ("$ref" in value) {
    const ref: string = value["$ref"] as string;
    references.add(_.first(ref.split("/"), 4).join("/"));
  }

  Object.keys(value).forEach((property: string) => findAllReferences((value as Record<string, unknown>)[property], references));
}

const componentTypeNames = ["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "links", "callbacks"] as const;
type ComponentTypeName = (typeof componentTypeNames)[number];
