import { OpenAPIV3 } from "openapi-types";

import { PaginationParameters } from "../parameters";
import { arraySchema, asArray, toSummaryCase } from "../util";

import { FindQueryGenerator, FindQueryProcessorContext } from "./find-query";
import { QueryProcessorContext } from "./query-generator";
import { Metadata } from "./util";

import { aOrAn, Objects, oxfordJoin, toPascalCase } from "../../../common";
import { ListQuery } from "../../../specification";
import { Url, UrlBuilder } from "../builder";

export class FindAllQueryGenerator extends FindQueryGenerator<ListQuery> {
  protected getFindKeyword(): keyof ListQuery {
    return "findAll";
  }

  protected buildOperationId(query: ListQuery, context: FindQueryProcessorContext): string {
    if (query.name) {
      return query.name;
    }

    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;
    const suffix = toPascalCase(Objects.orElse(query.withSuffix, ""));

    return `list${Objects.requireNonNull(givenDirectives)
      .map((directive) => {
        const name = directive.asCollection(context);
        return toPascalCase(name);
      })
      .join("")}${toPascalCase(findDirective?.asCollection(context))}${suffix}`;
  }

  protected buildUrl(query: ListQuery, context: FindQueryProcessorContext): Url {
    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;

    const urlBuilder = UrlBuilder.newBuilder();
    const pathBuilder = urlBuilder.path();

    if (query.filterableBy || query.sortableBy) {
      pathBuilder.withNoun("list", false);
    }

    for (const directive of Objects.requireNonNull(givenDirectives)) {
      pathBuilder.withNoun(directive.asCollection(context), false);
      if (!directive.isSingleton(context)) {
        pathBuilder.withIdentifier(directive.asIdentifier(context));
      }
    }

    pathBuilder.withNoun(Objects.requireNonNull(findDirective).asCollection(context), false);

    if (query.withSuffix) {
      pathBuilder.withNoun(query.withSuffix, false);
    }

    return urlBuilder.build();
  }

  protected buildSummary(query: ListQuery, context: FindQueryProcessorContext): string {
    if (query.summary) {
      return query.summary;
    }

    const findDirective = context.findDirective;
    const suffix = query.withSuffix ? ` ${toSummaryCase(query.withSuffix)}` : "";

    let summary = "List all ";
    summary += toSummaryCase(Objects.requireNonNull(findDirective).asCollection(context));
    if (query.given) {
      summary += ` for a given ${oxfordJoin(
        asArray(query.given).map((term) => `${aOrAn(term)} ${toSummaryCase(term)}`),
        "and",
      )}`;
    }

    summary += `${suffix}.`;

    return summary;
  }

  protected buildResponse(query: ListQuery, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return arraySchema(this.getBaseSchemaObject(query, context));
  }

  /**
   * Builds the additional parameters for the request.  Defaults to `[]`.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the additional parameters for the request.
   */
  protected buildParameters(query: ListQuery): Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> {
    if (!query.filterableBy && !query.sortableBy) {
      return PaginationParameters;
    }

    return [];
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

  protected buildRequest(query: ListQuery, context: QueryProcessorContext): OpenAPIV3.SchemaObject | undefined {
    const requestBody = super.buildRequest(query, context);
    if (!requestBody) {
      return undefined;
    }

    requestBody.properties = Objects.orEmpty(requestBody.properties);
    requestBody.properties["limit"] = {
      $ref: "#/components/schemas/Limit",
    };

    requestBody.properties["offset"] = {
      $ref: "#/components/schemas/Offset",
    };

    return requestBody;
  }
}
