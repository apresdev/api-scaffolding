import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, Url, UrlBuilder } from "../builder";
import { PaginationParameters } from "../parameters";
import { arraySchema, entitySchemaRef, toSummaryCase } from "../util";

import { QueryGenerator, QueryProcessorContext } from "./query-generator";
import { Metadata } from "./util";

import { JsonPath, checkNotNull, pluralize, toCamelCase, toPascalCase } from "../../../common";
import { asSchemaObject } from "../../../entities";
import { EntityName, EntityProjection, SearchQuery, isEntityProjection } from "../../../specification";
import { EntityProjections, Joins } from "../../../specification/joins";
import { filterableBy } from "./filters";

/**
 * The SearchQueryGenerator renders a SearchQuery as an OpenAPI operation.
 */
export class SearchQueryGenerator implements QueryGenerator<SearchQuery> {
  /**
   * Renders a Query as an OpenAPI operation.
   *
   * @param query   The user supplied query to be rendered as an OpenAPI operation.
   * @param context The execution context.
   */
  render(query: SearchQuery, context: QueryProcessorContext): void {
    checkNotNull(query, "query must be specified.");
    checkNotNull(context, "context must be specified.");

    const url = this.buildUrl(query);
    const operationId = this.buildOperationId(query);
    const summary = this.buildSummary(query);
    const additionalParams = this.buildParameters();
    const tag = this.buildTag(query);
    const requestBody = this.buildRequestBody(query, context);
    const response = this.buildResponse(query, context);
    const metaData = this.buildMetaData();

    OpenAPIBuilder.newBuilder(context.openAPI, context.schemaRegistry)
      .path(url.path)
      .post()
      .withOperationId(toCamelCase(operationId))
      .withSummary(summary)
      .withParameters([...url.parameters, ...additionalParams])
      .withTag(tag)
      .withRequestBody(requestBody)
      .withSuccessResponse(200, summary, response, metaData)
      .build();
  }

  /**
   * Builds the operation tag.
   *
   * @param query   The query to render.
   *
   * @returns the operation tag.
   */
  protected buildTag(query: SearchQuery): string {
    return query.tag || toPascalCase(pluralize(Joins.viaFrom(query.search)));
  }
  /**
   * Builds the operation tag.
   *
   * @param query   The query to render.
   *
   * @returns the operation tag.
   */
  protected buildRequestBody(query: SearchQuery, context: QueryProcessorContext): OpenAPIV3.SchemaObject {
    const requestBody: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        query: {
          type: "string",
        },
      },
    };

    if (query.filterableBy) {
      requestBody.properties = requestBody.properties || {};
      requestBody.properties["filterBy"] = filterableBy(query.filterableBy, Joins.viaFrom(query.search), {
        ...context,
        jsonPath: JsonPath.resolve(context.jsonPath || "", "filterableBy"),
      }) as OpenAPIV3.SchemaObject;
    }

    return requestBody;
  }

  /**
   * Builds the operation URL.
   *
   * @param query   The query to render.
   *
   * @returns the operation URL.
   */
  protected buildUrl(query: SearchQuery): Url {
    return UrlBuilder.newBuilder().path().withNoun("search", false).withNoun(Joins.viaFrom(query.search), true).end().build();
  }

  /**
   * Builds the operation identifier for the query.
   *
   * @param query   The query to render.
   *
   * @returns the operation identifier for the query.
   */
  protected buildOperationId(query: SearchQuery): string {
    if (query.name) {
      return query.name;
    }

    return "search" + toPascalCase(pluralize(Joins.viaFrom(query.search)));
  }

  /**
   * Builds the summary string for the query.
   *
   * @param query   The query to render.
   *
   * @returns the summary string for the query.
   */
  protected buildSummary(query: SearchQuery): string {
    if (query.summary) {
      return query.summary;
    }

    return "Searches for " + toSummaryCase(pluralize(Joins.viaFrom(query.search))) + ".";
  }

  /**
   * Builds the response data schema.
   *
   * @param query   The query to render.
   * @returns the response data schema.
   */
  protected buildResponse(query: SearchQuery, context: QueryProcessorContext): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject {
    if (isEntityProjection(query.search)) {
      const entityProjection: EntityProjection = query.search as EntityProjection;

      return arraySchema(
        asSchemaObject(
          EntityProjections.projectionSchema(
            entityProjection,
            EntityProjections.viaFrom(entityProjection),
            JsonPath.resolve(context.jsonPath || "", "search"),
            context,
          ),
        ),
      );
    }

    return arraySchema(entitySchemaRef(toPascalCase(query.search as EntityName)));
  }

  /**
   * Builds the additional parameters for the request.  Defaults to `[]`.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the additional parameters for the request.
   */
  protected buildParameters(): Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> {
    return PaginationParameters;
  }

  /**
   * Builds the schema for the response metadata, if metadata should exist.  Defaults to `undefined`.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the schema for the response metadata, if metadata should exist.
   */
  protected buildMetaData(): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined {
    return Metadata;
  }
}
