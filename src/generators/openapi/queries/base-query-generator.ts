import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, Url } from "../builder";

import { QueryGenerator, QueryProcessorContext } from "./query-generator";

import { checkNotNull, toCamelCase } from "../../../common";
import { Query } from "../../../specification";

/**
 * Provides a base implementation of a QueryGenerator that splits the building into the constituent OpenAPI parts.
 */
export abstract class BaseQueryGenerator<T extends Query> implements QueryGenerator<T> {
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
    const response = this.buildResponse(query, context);
    const metaData = this.buildMetaData(query, context);

    OpenAPIBuilder.newBuilder(context.openAPI, context.schemaRegistry)
      .path(url.path)
      .get()
      .withOperationId(toCamelCase(operationId))
      .withSummary(summary)
      .withParameters([...url.parameters, ...additionalParams])
      .withTag(tag)
      .withSuccessResponse(200, summary, response, metaData)
      .build();
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
}
