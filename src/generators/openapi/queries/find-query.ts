import { OpenAPIV3 } from "openapi-types";

import { BaseQueryGenerator } from "./base-query-generator";
import { QueryProcessorContext } from "./query-generator";

import { Objects, pluralize, toPascalCase } from "../../../common";
import { ListQuery, RetrieveQuery } from "../../../specification";
import { EntityDirective, compileDirectives } from "./directives";

export interface FindQueryProcessorContext extends QueryProcessorContext {
  givenDirectives?: EntityDirective[];
  findDirective?: EntityDirective;
}

/**
 * The FindQueryGenerator is the base class for the `findOne` and `findAll` query renderers.
 */
export abstract class FindQueryGenerator<T extends ListQuery | RetrieveQuery> extends BaseQueryGenerator<T> {
  /**
   * Runs all pre-check validations on the query.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  protected beforeRender(query: T, context: FindQueryProcessorContext): void {
    compileDirectives(query, this.getFindKeyword(), context);
  }

  /**
   * Determines the base entity type that the query is returning.
   *
   * @param query   The query to be rendered.
   * @param context The execution context.
   *
   * @returns the base entity type that the query is returning.
   */
  protected getSourceEntity(query: T, context: FindQueryProcessorContext): string {
    return Objects.requireNonNull(context.findDirective).entity();
  }

  protected buildTag(query: T, context: FindQueryProcessorContext): string {
    if (query.tag) {
      return query.tag;
    }

    const sourceEntity = toPascalCase(this.getSourceEntity(query, context));
    return toPascalCase(pluralize(sourceEntity));
  }

  protected abstract getFindKeyword(): keyof T;

  protected getBaseSchemaObject(query: T, context: FindQueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return Objects.requireNonNull(context.findDirective).schema(context);
  }
}
