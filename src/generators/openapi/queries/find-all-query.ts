import { OpenAPIV3 } from "openapi-types";

import { PaginationParameters } from "../parameters";
import { arraySchema, asArray, toSummaryCase } from "../util";

import { FindQueryGenerator, FindQueryProcessorContext } from "./find-query";
import { QueryProcessorContext } from "./query-generator";
import { IllegalState, Metadata } from "./util";

import { aOrAn, oxfordJoin, toPascalCase } from "../../../common";
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
    if (!givenDirectives) {
      throw new IllegalState();
    }

    return (
      "list" +
      givenDirectives
        .map((directive) => {
          const name = directive.asCollection(context);
          return toPascalCase(name);
        })
        .join("") +
      toPascalCase(findDirective?.asCollection(context))
    );
  }

  protected buildUrl(query: ListQuery, context: FindQueryProcessorContext): Url {
    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;
    if (!givenDirectives || !findDirective) {
      throw new IllegalState();
    }

    const urlBuilder = UrlBuilder.newBuilder();
    const pathBuilder = urlBuilder.path();

    if (query.filterableBy || query.sortableBy) {
      pathBuilder.withNoun("list", false);
    }

    givenDirectives.forEach((directive) => {
      pathBuilder.withNoun(directive.asCollection(context), false);
      if (!directive.isSingleton(context)) {
        pathBuilder.withIdentifier(directive.asIdentifier(context));
      }
    });

    pathBuilder.withNoun(findDirective.asCollection(context), false);

    return urlBuilder.build();
  }

  // protected buildOperationId(query: ListQuery, context: QueryProcessorContext): string {
  //   if (query.name) {
  //     return query.name;
  //   }

  //   const entities = asArray(query.findAll);
  //   return (
  //     "list" +
  //     entities
  //       .map((directive: JoinDirective, index: number): string => {
  //         const entity = Joins.viaFrom(directive);

  //         const isEntity = context.schemaRegistry.has(entity);
  //         if (isEntity) {
  //           return toPascalCase(index === entities.length - 1 ? pluralize(entity) : entity);
  //         } else {
  //           return toPascalCase(entity);
  //         }
  //       })
  //       .join("")
  //   );
  // }
  protected buildSummary(query: ListQuery, context: FindQueryProcessorContext): string {
    if (query.summary) {
      return query.summary;
    }

    const findDirective = context.findDirective;
    if (!findDirective) {
      throw new IllegalState();
    }

    let summary = "List all ";
    summary += toSummaryCase(findDirective.asCollection(context));
    if (query.given) {
      summary +=
        " for a given " +
        oxfordJoin(
          asArray(query.given).map((term) => `${aOrAn(term)} ${toSummaryCase(term)}`),
          "and",
        );
    }

    summary += ".";

    return summary;

    // const entities = asArray<JoinDirective>(query.findAll);
    // const sourceDirective = entities.pop();
    // if (!sourceDirective) {
    //   throw new Error("could not determine source entity");
    // }

    // const sourceEntity = Joins.viaFrom(sourceDirective);
    // const isNotAliased = context.schemaRegistry.has(sourceEntity);

    // return (
    //   "List all " +
    //   toSummaryCase(isNotAliased ? pluralize(sourceEntity) : sourceEntity) +
    //   (entities.length > 0
    //     ? entities.reduce((prev, current, index) => {
    //         return prev + (index > 0 ? " and " : "") + toSummaryCase(Joins.viaFrom(current));
    //       }, " for a given ")
    //     : "") +
    //   "."
    // );
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

    requestBody.properties = requestBody.properties || {};
    requestBody.properties["limit"] = {
      $ref: "#/components/schemas/Limit",
    };

    requestBody.properties["offset"] = {
      $ref: "#/components/schemas/Offset",
    };

    return requestBody;
  }
}
