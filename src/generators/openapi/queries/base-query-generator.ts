import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, Url } from "../builder";

import { QueryGenerator, QueryProcessorContext } from "./query-generator";

import { checkNotNull, toCamelCase } from "../../../common";
import { PathError } from "../../../common/io";
import { asSchemaObject } from "../../../entities";
import { BaseQuery, EntityName, EntityProjection, EntitySchema, JoinDirective, Nodes } from "../../../specification";
import { EntityProjections, Joins } from "../../../specification/joins";
import { arraySchema, asArray } from "../util";
import { forEachItem } from "./util";

/**
 * Provides a base implementation of a QueryGenerator that splits the building into the constituent OpenAPI parts.
 */
export abstract class BaseQueryGenerator<T extends BaseQuery> implements QueryGenerator<T> {
  /**
   * Renders a Query as an OpenAPI operation.
   *
   * @param query   The user supplied query to be rendered as an OpenAPI operation.
   * @param context The execution context.
   */
  render(query: T, context: QueryProcessorContext): void {
    checkNotNull(query, "query must be specified.");
    checkNotNull(context, "context must be specified.");

    this.beforeRender(query, context);

    const url = this.buildUrl(query, context);
    const operationId = this.buildOperationId(query, context);
    const summary = this.buildSummary(query, context);
    const additionalParams = this.buildParameters(query, context);
    const tag = this.buildTag(query, context);
    const requestBody = this.buildRequest(query, context);
    const response = this.buildResponse(query, context);
    const metaData = this.buildMetaData(query, context);
    const method: OpenAPIV3.HttpMethods = requestBody ? OpenAPIV3.HttpMethods.POST : OpenAPIV3.HttpMethods.GET;

    const opBuilder = OpenAPIBuilder.newBuilder(context.openAPI, context.schemaRegistry)
      .path(url.path)
      .method(method)
      .withOperationId(toCamelCase(operationId))
      .withSummary(summary)
      .withParameters([...url.parameters, ...additionalParams])
      .withTag(tag)
      .withSuccessResponse(200, summary, response, metaData);

    if (requestBody) {
      opBuilder.withRequestBody(requestBody);
    }

    opBuilder.build();
  }

  /**
   * Fired before the query is rendered.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeRender(query: T, context: QueryProcessorContext): void {
    // Do nothing
  }

  /**
   * Builds the query's URL.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the query's URL.
   */
  protected abstract buildUrl(query: T, context: QueryProcessorContext): Url;

  /**
   * Builds the operation identifier.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the operation identifier.
   */
  protected abstract buildOperationId(query: T, context: QueryProcessorContext): string;

  /**
   * Builds the summary for the operation.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the summary for the operation.
   */
  protected abstract buildSummary(query: T, context: QueryProcessorContext): string;

  /**
   * Builds the tag for the operation.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the tag for the operation
   */
  protected abstract buildTag(query: T, context: QueryProcessorContext): string;

  /**
   * Builds the additional parameters for the request.  Defaults to `[]`.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the additional parameters for the request.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected buildParameters(query: T, context: QueryProcessorContext): Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> {
    return [];
  }

  /**
   * Builds the schema for the response data.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the schema for the response data.
   */
  protected abstract buildResponse(query: T, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

  /**
   * Builds the schema for the response metadata, if metadata should exist.  Defaults to `undefined`.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the schema for the response metadata, if metadata should exist.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected buildMetaData(query: T, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined {
    return undefined;
  }

  protected buildRequest(query: T, context: QueryProcessorContext): OpenAPIV3.SchemaObject | undefined {
    if (!query.filterableBy && !query.sortableBy) {
      return undefined;
    }

    const requestBody: OpenAPIV3.SchemaObject = { type: "object" };
    requestBody.properties = requestBody.properties || {};

    const filterBy = this.buildFilters(query, context);
    if (filterBy) {
      requestBody.properties["filterBy"] = filterBy;
    }

    const orderBy = this.buildSort(query);
    if (orderBy) {
      requestBody.properties["orderBy"] = orderBy;
    }

    return requestBody;
  }

  private buildFilters(query: T, context: QueryProcessorContext): OpenAPIV3.SchemaObject | undefined {
    if (!query.filterableBy) {
      return;
    }

    const filters: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {},
    };

    const sourceEntity = this.getSourceEntity(query, context);
    const sourceNode = context.graph.has(sourceEntity) ? context.graph.get(sourceEntity) : undefined;

    forEachItem(query, "filterableBy", context.jsonPath || "", (join: JoinDirective, path: string) => {
      const entity = Joins.viaFrom(join);
      let entityName = entity;
      if (!sourceNode) {
        throw new PathError(`cannot join on [${sourceEntity}] as it has zero relationships`, path, "filterableBy");
      }

      let edgeSchema: EntitySchema | undefined;
      if (entity !== sourceEntity) {
        const edge = Nodes.findEdge(sourceNode, entity);
        if (!edge) {
          throw new PathError("could not determine filterable edge for name " + entity + " from " + sourceEntity, path, "filterableBy");
        }

        entityName = edge.node.name;
        edgeSchema = context.schemaRegistry.get(edge.node.name) as EntitySchema;
        if (!edgeSchema) {
          throw new PathError("could not find schema for filterable entity " + edge.name, path, "filterableBy");
        }
      } else {
        entityName = sourceEntity;
        edgeSchema = context.schemaRegistry.get(sourceEntity) as EntitySchema;
        if (!edgeSchema) {
          throw new PathError("could not find schema for filterable entity " + sourceEntity, path, "filterableBy");
        }
      }

      const projectionSchema = asSchemaObject(EntityProjections.projectionSchema(join as EntityProjection, entityName, path, context));
      projectionSchema.properties = projectionSchema.properties || {};

      Object.keys(projectionSchema.properties).forEach((property) => {
        projectionSchema.properties = projectionSchema.properties || {};
        const schema = Object.assign({}, projectionSchema.properties[property]);

        if ("readOnly" in schema) {
          delete schema.readOnly;
        }

        if ("type" in schema && schema.type === "array") {
          projectionSchema.properties[property] = schema;
        } else {
          projectionSchema.properties[property] = arraySchema(schema);
        }
      });

      filters.properties = filters.properties || {};
      filters.properties[toCamelCase(entity)] = projectionSchema;
    });

    return filters;
  }

  protected abstract getSourceEntity(query: T, context: QueryProcessorContext): EntityName;

  private buildSort(query: T): OpenAPIV3.SchemaObject | undefined {
    if (!query.sortableBy) {
      return;
    }

    const fieldNames: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: [],
    };

    fieldNames.enum = query.sortableBy.flatMap((projection) => {
      const entityName = EntityProjections.viaFrom(projection);
      return asArray(projection[entityName]).map((property) => `${toCamelCase(entityName)}.${toCamelCase(Joins.viaFrom(property))}`);
    });

    return arraySchema({
      type: "object",
      properties: {
        field: fieldNames,
        direction: {
          $ref: "#/components/schemas/SortDirection",
        },
      },
    });
  }
}
