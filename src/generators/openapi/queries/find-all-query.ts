import { OpenAPIV3 } from "openapi-types";

import { PaginationParameters } from "../parameters";
import { arraySchema, asArray, toSummaryCase } from "../util";

import { FindQueryGenerator } from "./find-query";
import { QueryProcessorContext } from "./query-generator";
import { Metadata } from "./util";

import { pluralize, toPascalCase } from "../../../common";
import { JoinDirective, ListQuery } from "../../../specification";
import { Joins } from "../../../specification/joins";

export class FindAllQueryGenerator extends FindQueryGenerator<ListQuery> {
  protected getFindKeyword(): keyof ListQuery {
    return "findAll";
  }

  protected buildOperationId(query: ListQuery, context: QueryProcessorContext): string {
    if (query.name) {
      return query.name;
    }

    const entities = asArray(query.findAll);
    return (
      "list" +
      entities
        .map((directive: JoinDirective, index: number): string => {
          const entity = Joins.viaFrom(directive);

          const isEntity = context.schemaRegistry.has(entity);
          if (isEntity) {
            return toPascalCase(index === entities.length - 1 ? pluralize(entity) : entity);
          } else {
            return toPascalCase(entity);
          }
        })
        .join("")
    );
  }
  protected buildSummary(query: ListQuery, context: QueryProcessorContext): string {
    if (query.summary) {
      return query.summary;
    }

    const entities = asArray(query.findAll);
    const sourceDirective = entities.pop();
    if (!sourceDirective) {
      throw new Error("could not determine source entity");
    }

    const sourceEntity = Joins.viaFrom(sourceDirective);
    const isNotAliased = context.schemaRegistry.has(sourceEntity);

    return (
      "List all " +
      toSummaryCase(isNotAliased ? pluralize(sourceEntity) : sourceEntity) +
      (entities.length > 0
        ? entities.reduce((prev, current, index) => {
            return prev + (index > 0 ? " and " : "") + toSummaryCase(Joins.viaFrom(current));
          }, " for a given ")
        : "") +
      "."
    );
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
