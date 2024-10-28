import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, Url, UrlBuilder } from "../builder";
import { PaginationParameters } from "../parameters";
import { arraySchema, toSummaryCase } from "../util";

import { QueryGenerator, QueryProcessorContext } from "./query-generator";
import { Metadata } from "./util";

import { JsonPath, Objects, checkNotNull, pluralize, toCamelCase, toPascalCase } from "../../../common";
import { SearchQuery } from "../../../specification";
import { EntityDirective, compileFind } from "./directives";
import { filterBy } from "./filters";

export interface SearchQueryProcessorContext extends QueryProcessorContext {
  directive: EntityDirective;
}

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
  render(query: SearchQuery, queryProcessorContext: QueryProcessorContext): void {
    checkNotNull(query, "query must be specified.");
    checkNotNull(queryProcessorContext, "context must be specified.");

    const context = queryProcessorContext as SearchQueryProcessorContext;

    context.directive = compileFind(query, "search", undefined, context);

    const url = this.buildUrl(query, context);
    const operationId = this.buildOperationId(query, context);
    const summary = this.buildSummary(query, context);
    const additionalParameters = this.buildParameters();
    const tag = this.buildTag(query, context);
    const requestBody = this.buildRequestBody(query, context);
    const response = this.buildResponse(query, context);
    const metaData = this.buildMetaData();

    OpenAPIBuilder.newBuilder(context.openAPI, context.schemaRegistry)
      .path(url.path)
      .post()
      .withOperationId(toCamelCase(operationId))
      .withSummary(summary)
      .withParameters([...url.parameters, ...additionalParameters])
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
  protected buildTag(query: SearchQuery, context: SearchQueryProcessorContext): string {
    return query.tag || toPascalCase(pluralize(context.directive.entity()));
  }
  /**
   * Builds the operation tag.
   *
   * @param query   The query to render.
   *
   * @returns the operation tag.
   */
  protected buildRequestBody(query: SearchQuery, context: SearchQueryProcessorContext): OpenAPIV3.SchemaObject {
    const requestBody: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        query: {
          type: "string",
        },
      },
    };

    if (query.filterableBy) {
      requestBody.properties = Objects.orEmpty(requestBody.properties);
      requestBody.properties["filterBy"] = filterBy(query.filterableBy, context.directive.entity(), {
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
  protected buildUrl(query: SearchQuery, context: SearchQueryProcessorContext): Url {
    return UrlBuilder.newBuilder().path().withNoun("search", false).withNoun(context.directive.entity(), true).end().build();
  }

  /**
   * Builds the operation identifier for the query.
   *
   * @param query   The query to render.
   *
   * @returns the operation identifier for the query.
   */
  protected buildOperationId(query: SearchQuery, context: SearchQueryProcessorContext): string {
    if (query.name) {
      return query.name;
    }

    return `search${toPascalCase(pluralize(context.directive.entity()))}`;
  }

  /**
   * Builds the summary string for the query.
   *
   * @param query   The query to render.
   *
   * @returns the summary string for the query.
   */
  protected buildSummary(query: SearchQuery, context: SearchQueryProcessorContext): string {
    if (query.summary) {
      return query.summary;
    }

    return `Searches for ${toSummaryCase(pluralize(context.directive.entity()))}.`;
  }

  /**
   * Builds the response data schema.
   *
   * @param query   The query to render.
   * @returns the response data schema.
   */
  protected buildResponse(query: SearchQuery, context: SearchQueryProcessorContext): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject {
    return arraySchema(context.directive.schema(context));
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
